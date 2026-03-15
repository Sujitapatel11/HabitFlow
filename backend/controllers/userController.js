const User = require('../models/User');
const Habit = require('../models/Habit');

/** GET /api/users/similar-goals — find users with overlapping goals */
const getSimilarUsers = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me.goals.length)
      return res.json({ success: true, data: [] });

    const users = await User.find({
      _id: { $ne: req.user.id },
      goals: { $in: me.goals },
    })
      .select('name bio goals avatar')
      .limit(20);

    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

/** GET /api/users/leaderboard — top users by habit streak */
const getLeaderboard = async (req, res, next) => {
  try {
    const topHabits = await Habit.aggregate([
      { $group: { _id: '$userId', maxStreak: { $max: '$streak' } } },
      { $sort: { maxStreak: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          avatar: '$user.avatar',
          maxStreak: 1,
        },
      },
    ]);

    res.json({ success: true, data: topHabits });
  } catch (err) { next(err); }
};

module.exports = { getSimilarUsers, getLeaderboard };
