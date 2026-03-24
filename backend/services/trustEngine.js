/**
 * trustEngine.js
 * Shadow penalty system — suspicious users are silently degraded, never hard-blocked.
 *
 * Trust score: 0–100 (100 = clean, 0 = bot-like)
 * Stored in Redis (TTL 24h) so it resets naturally for reformed users.
 * Falls back to in-memory Map in dev.
 *
 * Penalty tiers (invisible to user):
 *   CLEAN   (80–100): full XP, normal speed
 *   WATCH   (50–79):  XP ×0.75, 800ms artificial delay on completions
 *   SHADOW  (20–49):  XP ×0.40, 1800ms delay, community posts suppressed
 *   GHOST   (0–19):   XP ×0.10, 3000ms delay, posts suppressed, streak capped at 1
 *
 * Signals that reduce trust score:
 *   - Burst completions (many habits in short window)
 *   - Identical completion times across days (bot pattern)
 *   - Completing habits within seconds of each other
 *   - Undo → redo cycling (XP farming)
 *   - Completing habits created <30s ago
 */
const { getRedis } = require('./redisClient');
const logger = require('./logger');

const TRUST_KEY   = (uid) => `trust:${uid}`;
const HISTORY_KEY = (uid) => `trust:history:${uid}`;
const TTL_TRUST   = 86_400;   // 24 hours
const TTL_HISTORY = 3_600;    // 1 hour rolling window

// In-memory fallback for dev
const _mem = new Map();

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  { name: 'GHOST',  min: 0,  max: 19,  xpMult: 0.10, delayMs: 3000, suppressPost: true,  capStreak: true  },
  { name: 'SHADOW', min: 20, max: 49,  xpMult: 0.40, delayMs: 1800, suppressPost: true,  capStreak: false },
  { name: 'WATCH',  min: 50, max: 79,  xpMult: 0.75, delayMs: 800,  suppressPost: false, capStreak: false },
  { name: 'CLEAN',  min: 80, max: 100, xpMult: 1.00, delayMs: 0,    suppressPost: false, capStreak: false },
];

function getTier(score) {
  return TIERS.find(t => score >= t.min && score <= t.max) || TIERS[3];
}

// ── Redis helpers (with in-memory fallback) ───────────────────────────────────
async function getScore(userId) {
  try {
    const r = getRedis();
    if (r) {
      const v = await r.get(TRUST_KEY(userId));
      return v !== null ? parseInt(v) : 100;
    }
  } catch {}
  return _mem.get(TRUST_KEY(userId)) ?? 100;
}

async function setScore(userId, score) {
  const clamped = Math.max(0, Math.min(100, score));
  try {
    const r = getRedis();
    if (r) { await r.setex(TRUST_KEY(userId), TTL_TRUST, clamped); return; }
  } catch {}
  _mem.set(TRUST_KEY(userId), clamped);
}

async function getHistory(userId) {
  try {
    const r = getRedis();
    if (r) {
      const raw = await r.get(HISTORY_KEY(userId));
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return _mem.get(HISTORY_KEY(userId)) ?? [];
}

async function setHistory(userId, history) {
  try {
    const r = getRedis();
    if (r) { await r.setex(HISTORY_KEY(userId), TTL_HISTORY, JSON.stringify(history)); return; }
  } catch {}
  _mem.set(HISTORY_KEY(userId), history);
}

// ── Signal analysis ───────────────────────────────────────────────────────────
/**
 * Analyse a completion event and return a score delta (-ve = more suspicious).
 * All signals are probabilistic — no single signal hard-blocks.
 */
async function analyseCompletion(userId, habitId, habitCreatedAt) {
  const now = Date.now();
  const history = await getHistory(userId);

  // Prune to last hour
  const recent = history.filter(e => now - e.ts < 3_600_000);

  let delta = 0; // negative = suspicious

  // Signal 1: habit completed within 30s of creation (instant-complete bot pattern)
  if (habitCreatedAt && now - new Date(habitCreatedAt).getTime() < 30_000) {
    delta -= 25;
    logger.debug(`[Trust] ${userId} instant-complete signal (-25)`);
  }

  // Signal 2: same habit completed twice in recent history (should be blocked by streak logic, but belt+suspenders)
  const sameHabit = recent.filter(e => e.habitId === String(habitId));
  if (sameHabit.length > 0) {
    delta -= 30;
    logger.debug(`[Trust] ${userId} duplicate habit signal (-30)`);
  }

  // Signal 3: burst — more than 8 completions in last 10 minutes
  const burst = recent.filter(e => now - e.ts < 600_000);
  if (burst.length > 8) {
    delta -= 20;
    logger.debug(`[Trust] ${userId} burst signal (-20) count=${burst.length}`);
  }

  // Signal 4: undo-redo cycling — undo event followed immediately by complete
  const lastUndo = recent.filter(e => e.type === 'undo').pop();
  if (lastUndo && now - lastUndo.ts < 5_000) {
    delta -= 15;
    logger.debug(`[Trust] ${userId} undo-redo cycle signal (-15)`);
  }

  // Signal 5: robotic timing — completions within 200ms of each other (scripted)
  const veryRecent = recent.filter(e => now - e.ts < 200);
  if (veryRecent.length > 0) {
    delta -= 35;
    logger.debug(`[Trust] ${userId} robotic timing signal (-35)`);
  }

  // Natural recovery: clean completion with no signals = small positive
  if (delta === 0) delta = +2;

  // Record this event
  recent.push({ ts: now, habitId: String(habitId), type: 'complete' });
  await setHistory(userId, recent);

  return delta;
}

async function recordUndo(userId, habitId) {
  const history = await getHistory(userId);
  const now = Date.now();
  const recent = history.filter(e => now - e.ts < 3_600_000);
  recent.push({ ts: now, habitId: String(habitId), type: 'undo' });
  await setHistory(userId, recent);
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * evaluate(userId, habitId, habitCreatedAt)
 * Returns { tier, xpMult, delayMs, suppressPost, capStreak, score }
 * Call this in habitController before awarding XP.
 */
async function evaluate(userId, habitId, habitCreatedAt) {
  try {
    const delta    = await analyseCompletion(userId, habitId, habitCreatedAt);
    const current  = await getScore(userId);
    const newScore = Math.max(0, Math.min(100, current + delta));
    await setScore(userId, newScore);

    const tier = getTier(newScore);

    if (tier.name !== 'CLEAN') {
      logger.warn(`[Trust] ${userId} tier=${tier.name} score=${newScore} delta=${delta}`);
    }

    return { ...tier, score: newScore };
  } catch (err) {
    logger.warn(`[Trust] evaluate failed for ${userId}: ${err.message}`);
    // Fail open — never punish due to our own errors
    return { ...TIERS[3], score: 100 };
  }
}

/**
 * getProfile(userId) — returns current trust tier without modifying score.
 * Used by response interceptor to attach tier to every completion response.
 */
async function getProfile(userId) {
  try {
    const score = await getScore(userId);
    return { ...getTier(score), score };
  } catch {
    return { ...TIERS[3], score: 100 };
  }
}

module.exports = { evaluate, getProfile, recordUndo, getTier };
