const crypto = require('crypto');
const AppUser = require('../models/AppUser');
const RefreshToken = require('../models/RefreshToken');
const { setTokenCookies, clearTokenCookies, verifyRefresh, signAccess } = require('../services/tokenService');
const { sendOtpEmail } = require('../services/emailService');
const logger = require('../services/logger');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashToken  = (t) => crypto.createHash('sha256').update(t).digest('hex');

const safeUser = (u) => ({
  _id: u._id, name: u.name, email: u.email,
  goalCategory: u.goalCategory, bio: u.bio,
  streak: u.streak, avatar: u.avatar, createdAt: u.createdAt,
});

/** POST /api/auth/register */
const register = async (req, res, next) => {
  try {
    // req.body already validated + sanitized by Joi middleware
    const { name, email, password, goalCategory, bio } = req.body;

    const exists = await AppUser.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await AppUser.create({ name, email, password, goalCategory, bio });

    const { refresh } = setTokenCookies(res, user._id.toString(), user.email);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    logger.info(`[Auth] Registered: ${email}`);
    res.status(201).json({ success: true, data: safeUser(user) });
  } catch (err) { next(err); }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await AppUser.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const { refresh } = setTokenCookies(res, user._id.toString(), user.email);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    logger.info(`[Auth] Login: ${email} from ${req.ip}`);
    res.json({ success: true, data: safeUser(user) });
  } catch (err) { next(err); }
};

/** POST /api/auth/refresh — rotate refresh token */
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.hf_refresh;
    if (!token)
      return res.status(401).json({ success: false, message: 'No refresh token' });

    let decoded;
    try { decoded = verifyRefresh(token); }
    catch { return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' }); }

    const hash = hashToken(token);
    const stored = await RefreshToken.findOne({ tokenHash: hash });
    if (!stored)
      return res.status(401).json({ success: false, message: 'Token reuse detected' });

    // Rotate: delete old, issue new
    await RefreshToken.deleteOne({ _id: stored._id });

    const user = await AppUser.findById(decoded.sub).lean();
    if (!user)
      return res.status(401).json({ success: false, message: 'User not found' });

    const { refresh: newRefresh } = setTokenCookies(res, user._id.toString(), user.email);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ success: true, data: safeUser(user) });
  } catch (err) { next(err); }
};

/** POST /api/auth/logout */
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.hf_refresh;
    if (token) {
      await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
    }
    clearTokenCookies(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

/** POST /api/auth/forgot-password */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await AppUser.findOne({ email });
    // Always respond the same to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, an OTP was sent' });

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(user.email, otp, user.name);
    logger.info(`[Auth] OTP sent to ${email}`);
    res.json({ success: true, message: 'If that email exists, an OTP was sent' });
  } catch (err) { next(err); }
};

/** POST /api/auth/verify-otp */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await AppUser.findOne({ email });
    if (!user || !user.resetOtp || user.resetOtp !== otp || new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
};

/** POST /api/auth/reset-password */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await AppUser.findOne({ email });
    if (!user || !user.resetOtp || user.resetOtp !== otp || new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    // Revoke all existing refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });
    clearTokenCookies(res);

    logger.info(`[Auth] Password reset: ${email}`);
    res.json({ success: true, message: 'Password reset. Please log in again.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword };
