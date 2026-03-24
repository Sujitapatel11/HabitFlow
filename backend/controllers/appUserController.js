const AppUser = require('../models/AppUser');
const Habit   = require('../models/Habit');
const cache   = require('../services/cacheService');

/** GET /api/app-users */
const getAllUsers = async (req, res, next) => {
  try {
    const exclude = req.user.sub;
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(50, parseInt(req.query.limit) || 20);
    const skip    = (page - 1) * limit;

    const filter = { _id: { $ne: exclude }, isBanned: false };
    const [data, total] = await Promise.all([
      AppUser.find(filter)
        .select('name goalCategory bio streak xp avatar createdAt')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      AppUser.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

/** GET /api/app-users/similar */
const getSimilarUsers = async (req, res, next) => {
  try {
    const { goalCategory } = req.query;
    const exclude = req.user.sub;
    if (!goalCategory) return res.json({ success: true, data: [] });

    const cacheKey = `similar:${goalCategory}:${exclude}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const users = await AppUser.find({ goalCategory, _id: { $ne: exclude }, isBanned: false })
      .select('name goalCategory bio streak xp avatar createdAt')
      .limit(20).lean();

    await cache.set(cacheKey, users, 120);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

/** PATCH /api/app-users/:userId/streak */
const syncStreak = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const habits = await Habit.find({ userId }).select('streak').lean();
    const maxStreak = habits.length ? Math.max(...habits.map(h => h.streak), 0) : 0;
    const user = await AppUser.findByIdAndUpdate(userId, { streak: maxStreak }, { new: true });
    await cache.invalidateUser(userId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

/** PUT /api/app-users/:userId */
const updateUser = async (req, res, next) => {
  try {
    const { name, bio, goalCategory } = req.body;
    const user = await AppUser.findByIdAndUpdate(
      req.params.userId,
      { ...(name && { name: name.trim() }), ...(bio !== undefined && { bio }), ...(goalCategory && { goalCategory }) },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await cache.invalidateUser(req.params.userId);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, getSimilarUsers, syncStreak, updateUser };
