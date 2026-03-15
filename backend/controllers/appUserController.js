const AppUser = require('../models/AppUser');
const Habit = require('../models/Habit');

/** POST /api/app-users — register/get a user profile */
const registerUser = async (req, res, next) => {
  try {
    const { name, goalCategory, bio } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Name is required' });

    // Check if user with same name exists, return it
    let user = await AppUser.findOne({ name: name.trim() });
    if (!user) {
      user = await AppUser.create({ name: name.trim(), goalCategory, bio });
    }
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

/** GET /api/app-users — get all users except current */
const getAllUsers = async (req, res, next) => {
  try {
    const { exclude } = req.query;
    const filter = exclude ? { _id: { $ne: exclude } } : {};
    const users = await AppUser.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

/** GET /api/app-users/similar?goalCategory=Coding&exclude=userId */
const getSimilarUsers = async (req, res, next) => {
  try {
    const { goalCategory, exclude } = req.query;
    if (!goalCategory)
      return res.json({ success: true, data: [] });

    const filter = {
      goalCategory,
      ...(exclude ? { _id: { $ne: exclude } } : {}),
    };

    const users = await AppUser.find(filter).limit(20);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

/** PATCH /api/app-users/:id/streak — sync streak from habits */
const syncStreak = async (req, res, next) => {
  try {
    const habits = await Habit.find({ completed: true });
    const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
    const user = await AppUser.findByIdAndUpdate(req.params.id, { streak: maxStreak }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

module.exports = { registerUser, getAllUsers, getSimilarUsers, syncStreak };
