/**
 * antiCheat.js
 * Shadow penalty middleware — suspicious behaviour is silently degraded.
 * Normal users never see any indication this system exists.
 *
 * Hard blocks are ONLY used for:
 *   - Duplicate same-day completion (data integrity, not anti-cheat)
 *   - Backdated completions (impossible legitimately)
 *
 * Everything else → silent penalty via trustEngine.
 */
const logger = require('../services/logger');

// Per-user action log (in-memory; production: Redis)
const actionLog = new Map();
const BURST_WINDOW_MS = 60_000;
const BURST_MAX       = 20;

function recordAction(userId, action) {
  const now = Date.now();
  if (!actionLog.has(userId)) actionLog.set(userId, []);
  const log = actionLog.get(userId);
  log.push({ action, ts: now });
  const pruned = log.filter(e => now - e.ts < BURST_WINDOW_MS);
  actionLog.set(userId, pruned);
  return pruned;
}

/**
 * shadowGate — replaces hard minGap/burstCheck blocks.
 * Instead of rejecting, it:
 *   1. Records the suspicious signal (trustEngine handles scoring)
 *   2. Adds a synthetic delay proportional to suspicion level
 *   3. Lets the request through — the controller applies XP reduction
 *
 * The user sees a slightly slower response. Nothing else.
 */
const shadowGate = (action) => async (req, res, next) => {
  const userId = req.user?.sub;
  if (!userId) return next();

  const log = recordAction(userId, action);

  // Attach burst count to req so trustEngine can read it
  req._burstCount = log.length;
  req._actionTs   = Date.now();

  // Extreme burst (>20/min): add a silent 2s delay but still allow through
  // This makes scripted attacks slow without revealing detection
  if (log.length > BURST_MAX) {
    logger.warn(`[AntiCheat] burst detected — user ${userId} (${log.length}/min) — shadow delay applied`);
    req._shadowBurst = true;
    await new Promise(r => setTimeout(r, 2000));
  }

  next();
};

/**
 * burstCheck — kept for backward compat, now delegates to shadowGate.
 */
const burstCheck = shadowGate('burst');

/**
 * minGap — no longer hard-blocks. Records timing signal only.
 */
const minGap = (action) => (req, res, next) => {
  const userId = req.user?.sub;
  if (!userId) return next();
  recordAction(userId, action);
  next();
};

module.exports = { shadowGate, minGap, burstCheck };
