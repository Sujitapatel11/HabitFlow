/**
 * cacheService.js
 * Thin wrapper around Redis for application-level caching.
 * All methods are safe — they never throw; on Redis failure they return null.
 */
const { getRedis } = require('./redisClient');
const logger = require('./logger');

const TTL = {
  LEADERBOARD:  60,        // 1 minute
  USER_STATS:   120,       // 2 minutes
  USER_PROFILE: 300,       // 5 minutes
  THREADS:      30,        // 30 seconds
};

async function get(key) {
  try {
    const r = getRedis();
    if (!r) return null;
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    logger.warn(`[Cache] get(${key}) failed: ${e.message}`);
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  try {
    const r = getRedis();
    if (!r) return;
    await r.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (e) {
    logger.warn(`[Cache] set(${key}) failed: ${e.message}`);
  }
}

async function del(...keys) {
  try {
    const r = getRedis();
    if (!r) return;
    for (const k of keys) await r.del(k);
  } catch (e) {
    logger.warn(`[Cache] del failed: ${e.message}`);
  }
}

// Invalidate all cache keys for a user
async function invalidateUser(userId) {
  await del(
    `user:stats:${userId}`,
    `user:profile:${userId}`,
    `leaderboard:top50`,
  );
}

module.exports = { get, set, del, invalidateUser, TTL };
