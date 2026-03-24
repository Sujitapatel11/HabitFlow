const Habit      = require('../models/Habit');
const AppUser    = require('../models/AppUser');
const Post       = require('../models/Post');
const cache      = require('../services/cacheService');
const { notifQueue } = require('../services/queues');
const logger     = require('../services/logger');

const XP_PER_COMPLETION = 10;
const XP_STREAK_BONUS   = (s) => s >= 30 ? 30 : s >= 7 ? 20 : s >= 3 ? 10 : 0;

const utcDay  = (d = new Date()) => { const dt = new Date(d); dt.setUTCHours(0,0,0,0); return dt; };
const daysDiff = (a, b) => Math.round((utcDay(b) - utcDay(a)) / 86_400_000);

/** GET /api/habits */
const getHabits = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Habit.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Habit.countDocuments({ userId }),
    ]);

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

/** POST /api/habits */
const createHabit = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { name, description, category, frequency } = req.body;

    const count = await Habit.countDocuments({ userId });
    if (count >= 50)
      return res.status(400).json({ success: false, message: 'Maximum 50 habits allowed' });

    const habit = await Habit.create({ name, description, category, frequency: frequency || 'daily', userId });
    res.status(201).json({ success: true, data: habit });
  } catch (err) { next(err); }
};

/** POST /api/habits/:id/complete */
const completeHabit = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const habit  = await Habit.findOne({ _id: req.params.id, userId });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });

    const now = new Date();

    if (habit.lastCompletedDate) {
      const diff = daysDiff(habit.lastCompletedDate, now);
      if (diff === 0) return res.status(400).json({ success: false, message: 'Already completed today' });
      if (diff < 0)  return res.status(400).json({ success: false, message: 'Backdated completion not allowed' });
    }

    let newStreak = 1;
    if (habit.lastCompletedDate) {
      newStreak = daysDiff(habit.lastCompletedDate, now) === 1 ? habit.streak + 1 : 1;
    }

    habit.completed = true;
    habit.streak    = newStreak;
    habit.lastCompletedDate = now;
    await habit.save();

    const xpGained = XP_PER_COMPLETION + XP_STREAK_BONUS(newStreak);

    // Atomic XP + streak update
    const allHabits = await Habit.find({ userId }).select('streak').lean();
    const maxStreak = Math.max(...allHabits.map(h => h.streak), 0);
    await AppUser.findByIdAndUpdate(userId, { $inc: { xp: xpGained }, streak: maxStreak });

    // Invalidate cached stats
    await cache.invalidateUser(userId);

    // Community post (fire-and-forget — don't block response)
    AppUser.findById(userId).lean().then(user => {
      const streakMsg = newStreak > 1 ? ` ${newStreak}-day streak! 🔥` : '';
      Post.create({
        authorId: userId, authorName: user?.name || 'Someone',
        habitName: habit.name, category: habit.category, type: 'completion',
        message: `Just completed "${habit.name}"!${streakMsg} 💪`,
      }).catch(e => logger.warn(`[Habit] post create failed: ${e.message}`));
    });

    // Queue streak-risk notification if streak is at risk tomorrow
    await notifQueue.add('streak-reminder', { userId, habitId: habit._id, streak: newStreak });

    logger.info(`[Habit] ${userId} completed "${habit.name}" streak=${newStreak} xp+${xpGained}`);
    res.json({ success: true, data: habit, xpGained, newStreak });
  } catch (err) { next(err); }
};

/** POST /api/habits/:id/undo */
const undoHabit = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const habit  = await Habit.findOne({ _id: req.params.id, userId });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    if (!habit.completed) return res.status(400).json({ success: false, message: 'Habit not completed' });
    if (habit.lastCompletedDate && daysDiff(habit.lastCompletedDate, new Date()) !== 0)
      return res.status(400).json({ success: false, message: "Can only undo today's completion" });

    const xpToRemove = XP_PER_COMPLETION + XP_STREAK_BONUS(habit.streak);
    habit.completed = false;
    habit.streak    = Math.max(0, habit.streak - 1);
    habit.lastCompletedDate = null;
    await habit.save();

    await AppUser.findByIdAndUpdate(userId, { $inc: { xp: -xpToRemove } });
    await cache.invalidateUser(userId);

    res.json({ success: true, data: habit });
  } catch (err) { next(err); }
};

/** PUT /api/habits/:id */
const updateHabit = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { name, description, category } = req.body;
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId },
      { ...(name && { name }), ...(description !== undefined && { description }), ...(category && { category }) },
      { new: true, runValidators: true }
    );
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, data: habit });
  } catch (err) { next(err); }
};

/** DELETE /api/habits/:id */
const deleteHabit = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const habit  = await Habit.findOneAndDelete({ _id: req.params.id, userId });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) { next(err); }
};

module.exports = { getHabits, createHabit, completeHabit, undoHabit, updateHabit, deleteHabit };
