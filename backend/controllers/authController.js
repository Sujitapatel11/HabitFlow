const AppUser = require('../models/AppUser');
const { sendOtpEmail } = require('../services/emailService');

// Generate 6-digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/** POST /api/auth/register */
const register = async (req, res, next) => {
  try {
    const { name, email, password, goalCategory, bio } = req.body;
    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const exists = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered. Please log in.' });

    const user = await AppUser.create({ name: name.trim(), email, password, goalCategory: goalCategory || 'Other', bio: bio || '' });

    const safe = { _id: user._id, name: user.name, email: user.email, goalCategory: user.goalCategory, bio: user.bio, streak: user.streak, createdAt: user.createdAt };
    res.status(201).json({ success: true, data: safe });
  } catch (err) { next(err); }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ success: false, message: 'No account found with that email' });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Incorrect password' });

    const safe = { _id: user._id, name: user.name, email: user.email, goalCategory: user.goalCategory, bio: user.bio, streak: user.streak, createdAt: user.createdAt };
    res.json({ success: true, data: safe });
  } catch (err) { next(err); }
};

/** POST /api/auth/forgot-password */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(404).json({ success: false, message: 'No account found with that email' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpiry = expiry;
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(user.email, otp, user.name);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) { next(err); }
};

/** POST /api/auth/verify-otp */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const user = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetOtp)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    if (user.resetOtp !== otp)
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    if (new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) { next(err); }
};

/** POST /api/auth/reset-password */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, OTP and new password required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await AppUser.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetOtp)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    if (user.resetOtp !== otp)
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    if (new Date() > user.resetOtpExpiry)
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });

    user.password = newPassword; // pre-save hook will hash it
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, forgotPassword, verifyOtp, resetPassword };
