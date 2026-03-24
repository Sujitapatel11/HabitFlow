const crypto   = require('crypto');
const AppUser   = require('../models/AppUser');
const RefreshToken = require('../models/RefreshToken');
const { setTokenCookies, clearTokenCookies, verifyRefresh } = require('../services/tokenService');
const { sendOtpEmail, sendVerificationEmail } = require('../services/emailService');
const logger    = require('../services/logger');

const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 min
const OTP_TTL_MS    = 10 * 60 * 1000; // 10 min
const VERIFY_TTL_MS = 15 * 60 * 1000; // 15 min

const generateOtp   = () => String(Math.floor(100000 + Math.random() * 900000));
const hashToken     = (t) => crypto.createHash('sha256').update(t).digest('hex');
const randomToken   = () => crypto.randomBytes(32).toString('hex');

const safeUser = (u) => ({
  _id: u._id, name: u.name, email: u.email,
  goalCategory: u.goalCategory, bio: u.bio,
  streak: u.streak, avatar: u.avatar,
  isVerified: u.isVerified, createdAt: u.createdAt,
});

/** POST /api/auth/register */
const register = async (req, res, next) => {
  try {
    const { name, email, password, goalCategory, bio } = req.body;

    if (await AppUser.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const verifyToken  = randomToken();
    const user = await AppUser.create({
      name, email, password, goalCategory, bio,
      isVerified: false,
      verifyToken: hashToken(verifyToken),
      verifyTokenExpiry: new Date(Date.now() + VERIFY_TTL_MS),
    });

    await sendVerificationEmail(email, verifyToken, name);
    logger.info(`[Auth] Registered: ${email} — verification email sent`);

    res.status(201).json({
      success: true,
      message: 'Account created. Check your email to verify before logging in.',
      data: safeUser(user),
    });
  } catch (err) { next(err); }
};

/** GET /api/auth/verify-email?token=... */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const hashed = hashToken(token);
    const user = await AppUser.findOne({
      verifyToken: hashed,
      verifyTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: 'Verification link is invalid or expired' });

    user.isVerified       = true;
    user.verifyToken      = null;
    user.verifyTokenExpiry = null;
    await user.save({ validateBeforeSave: false });

    logger.info(`[Auth] Email verified: ${user.email}`);
    // Redirect to frontend with success flag
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=1`);
  } catch (err) { next(err); }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await AppUser.findOne({ email })
      .select('+password +loginAttempts +lockoutUntil');

    // Generic message — don't reveal whether email exists
    const FAIL = () => res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user) return FAIL();

    // Brute-force lockout check
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const mins = Math.ceil((user.lockoutUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`,
      });
    }

    // Legacy accounts created before email verification was added have no verifyToken
    // and isVerified=false — auto-verify them so they aren't permanently locked out
    if (!user.isVerified && !user.verifyToken) {
      user.isVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    if (!user.isVerified)
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });

    const match = await user.matchPassword(password);
    if (!match) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockoutUntil  = new Date(Date.now() + LOCKOUT_MS);
        user.loginAttempts = 0;
        await user.save({ validateBeforeSave: false });
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Account locked for 15 minutes.`,
        });
      }
      await user.save({ validateBeforeSave: false });
      return FAIL();
    }

    // Success — reset counters
    user.loginAttempts = 0;
    user.lockoutUntil  = null;
    await user.save({ validateBeforeSave: false });

    const { refresh } = setTokenCookies(res, user._id.toString(), user.email);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    logger.info(`[Auth] Login: ${email}`);
    res.json({ success: true, data: safeUser(user) });
  } catch (err) { next(err); }
};

/** POST /api/auth/refresh */
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.hf_refresh;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

    let decoded;
    try { decoded = verifyRefresh(token); }
    catch { return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' }); }

    const hash   = hashToken(token);
    const stored = await RefreshToken.findOne({ tokenHash: hash });
    if (!stored) return res.status(401).json({ success: false, message: 'Token reuse detected' });

    await RefreshToken.deleteOne({ _id: stored._id });

    const user = await AppUser.findById(decoded.sub).lean();
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

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
    if (token) await RefreshToken.deleteOne({ tokenHash: hashToken(token) });
    clearTokenCookies(res);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

/** POST /api/auth/forgot-password */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const SAFE = () => res.json({ success: true, message: 'If that email exists, an OTP was sent' });

    const user = await AppUser.findOne({ email }).select('+resetOtp +resetOtpExpiry');
    if (!user) return SAFE();

    const otp = generateOtp();
    user.resetOtp       = hashToken(otp); // store hashed
    user.resetOtpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(email, otp, user.name);
    logger.info(`[Auth] OTP sent: ${email}`);
    return SAFE();
  } catch (err) { next(err); }
};

/** POST /api/auth/verify-otp */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await AppUser.findOne({ email }).select('+resetOtp +resetOtpExpiry');
    if (!user || !user.resetOtp || user.resetOtp !== hashToken(otp) || new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
};

/** POST /api/auth/reset-password */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await AppUser.findOne({ email }).select('+resetOtp +resetOtpExpiry +password');
    if (!user || !user.resetOtp || user.resetOtp !== hashToken(otp) || new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    user.password       = newPassword;
    user.resetOtp       = null;
    user.resetOtpExpiry = null;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });
    clearTokenCookies(res);

    logger.info(`[Auth] Password reset: ${email}`);
    res.json({ success: true, message: 'Password reset. Please log in again.' });
  } catch (err) { next(err); }
};

/** POST /api/auth/resend-verification */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await AppUser.findOne({ email }).select('+verifyToken +verifyTokenExpiry +isVerified');
    if (!user || user.isVerified)
      return res.json({ success: true, message: 'If applicable, a new link was sent.' });

    const token = randomToken();
    user.verifyToken       = hashToken(token);
    user.verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(email, token, user.name);
    res.json({ success: true, message: 'Verification email resent.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword, verifyEmail, resendVerification };
