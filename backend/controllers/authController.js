const AppUser = require('../models/AppUser');

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

module.exports = { register, login };
