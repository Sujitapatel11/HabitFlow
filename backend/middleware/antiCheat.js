const logger = require('../services/logger');

// In-memory action log per user (production: move to Redis)
// Structure: userId → [{ action, ts }]
const actionLog = new Map();
const MIN_GAP_MS = 5000;       // 5 seconds between any two actions
const BURST_WINDOW_MS = 60000; // 1 minute window
const BURST_MAX = 20;          // max 20 actions per minute per user

function recordAction(userId, action) {
  const now = Date.now();
  if (!actionLog.has(userId)) actionLog.set(userId, []);
  const log = actionLog.get(userId);
  log.push({ action, ts: now });

  // Prune entries older than 1 minute
  const cutoff = now - BURST_WINDOW_MS;
  const pruned = log.filter(e => e.ts > cutoff);
  actionLog.set(userId, pruned);
  return pruned;
}

/**
 * minGap — enforces a minimum time gap between consecutive actions.
 * Prevents double-tap / script-driven rapid completions.
 */
const minGap = (action) => (req, res, next) => {
  const userId = req.user?.sub;
  if (!userId) return next();

  const now = Date.now();
  const log = actionLog.get(userId) || [];
  const last = log.filter(e => e.action === action).pop();

  if (last && now - last.ts < MIN_GAP_MS) {
    logger.warn(`[AntiCheat] minGap violation — user ${userId} action ${action}`);
    return res.status(429).json({ success: false, message: 'Action too fast. Wait a moment.' });
  }

  recordAction(userId, action);
  next();
};

/**
 * burstCheck — blocks users who fire more than BURST_MAX actions/minute.
 */
const burstCheck = (req, res, next) => {
  const userId = req.user?.sub;
  if (!userId) return next();

  const log = recordAction(userId, 'burst');
  if (log.length > BURST_MAX) {
    logger.warn(`[AntiCheat] burst violation — user ${userId} (${log.length} actions/min)`);
    return res.status(429).json({ success: false, message: 'Too many actions. Slow down.' });
  }
  next();
};

module.exports = { minGap, burstCheck };
