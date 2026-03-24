const AppUser = require('../models/AppUser');
const cache   = require('../services/cacheService');
const logger  = require('../services/logger');

/**
 * GET /api/users/leaderboard
 * Weighted score = (streak × 0.4) + (xp/10 × 0.4) + (reputationScore × 0.2)
 * Cached in Redis for 60 seconds.
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const CACHE_KEY = 'leaderboard:top50';
    const cached = await cache.get(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const users = await AppUser.find({ isBanned: false })
      .select('name avatar streak xp reputationScore goalCategory')
      .sort({ streak: -1, xp: -1 })
      .limit(50)
      .lean();

    // Weighted composite score
    const ranked = users
      .map(u => ({
        ...u,
        score: Math.round(
          (u.streak * 0.4) +
          ((u.xp / 10) * 0.4) +
          (u.reputationScore * 0.2)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    await cache.set(CACHE_KEY, ranked, cache.TTL.LEADERBOARD);
    res.json({ success: true, data: ranked, cached: false });
  } catch (err) { next(err); }
};

module.exports = { getLeaderboard };
