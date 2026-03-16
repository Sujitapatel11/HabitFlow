const Habit = require('../models/Habit');
const Post = require('../models/Post');

const getHabits = async (req, res, next) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId } : {};
    const habits = await Habit.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: habits.length, data: habits });
  } catch (err) { next(err); }
};

const createHabit = async (req, res, next) => {
  try {
    const { name, description, category, userId } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Habit name is required' });
    const habit = await Habit.create({ name, description, category, userId: userId || '' });
    res.status(201).json({ success: true, data: habit });
  } catch (err) { next(err); }
};

const updateHabit = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    const { authorName } = req.body;

    // Strip non-schema fields before saving
    delete updates.authorName;

    const existing = await Habit.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Habit not found' });

    const wasCompleted = existing.completed;

    if (updates.completed === true) {
      const today = new Date();
      const last = existing.lastCompletedDate;
      const isConsecutive = last && (today - new Date(last)) / (1000 * 60 * 60 * 24) < 2;
      updates.streak = isConsecutive ? existing.streak + 1 : 1;
      updates.lastCompletedDate = today;
    } else if (updates.completed === false) {
      updates.streak = 0;
      updates.lastCompletedDate = null;
    }

    const habit = await Habit.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    // Auto-post to community feed when marking complete (not when un-completing)
    if (updates.completed === true && !wasCompleted) {
      const streak = habit.streak;
      const streakMsg = streak > 1 ? ` That's a ${streak}-day streak! 🔥` : '';
      await Post.create({
        authorName: authorName || 'Someone',
        habitName: habit.name,
        category: habit.category,
        type: 'completion',
        message: `Just completed "${habit.name}"!${streakMsg} Keep going! 💪`,
      });
    }

    res.json({ success: true, data: habit });
  } catch (err) { next(err); }
};

const deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findByIdAndDelete(req.params.id);
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) { next(err); }
};

module.exports = { getHabits, createHabit, updateHabit, deleteHabit };
