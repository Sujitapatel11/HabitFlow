/**
 * redisClient.js
 * Exports:
 *   redis   — general-purpose client (cache, rate-limit store)
 *   pub     — publisher client for Socket.io adapter
 *   sub     — subscriber client for Socket.io adapter
 *   getRedis() — safe getter (returns null if not configured)
 */
const Redis  = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || null;
const IS_PROD   = process.env.NODE_ENV === 'production';

const BASE_OPTS = {
  maxRetriesPerRequest: null,          // BullMQ requires null
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('[Redis] Max reconnect attempts reached');
      return null;
    }
    const delay = Math.min(times * 150, 3000);
    logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
};

let redis = null;
let pub   = null;
let sub   = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, BASE_OPTS);
  pub   = new Redis(REDIS_URL, BASE_OPTS);
  sub   = new Redis(REDIS_URL, BASE_OPTS);

  for (const [name, client] of [['redis', redis], ['pub', pub], ['sub', sub]]) {
    client.on('ready',        () => logger.info(`[Redis:${name}] connected`));
    client.on('error',   (e) => logger.error(`[Redis:${name}] ${e.message}`));
    client.on('reconnecting', () => logger.warn(`[Redis:${name}] reconnecting…`));
  }
} else if (IS_PROD) {
  logger.error('[Redis] REDIS_URL is required in production. Exiting.');
  process.exit(1);
} else {
  // Dev-only in-memory fallback (single process only)
  const { EventEmitter } = require('events');
  const bus = new EventEmitter();
  bus.setMaxListeners(500);

  const memStore = new Map();

  // Minimal Redis-compatible shim for dev
  const makeShim = () => ({
    publish:     (ch, msg)  => { bus.emit(ch, msg); return Promise.resolve(1); },
    subscribe:   (ch, cb)   => { bus.on(ch, cb);    return Promise.resolve(); },
    unsubscribe: (ch)       => { bus.removeAllListeners(ch); return Promise.resolve(); },
    get:         (k)        => Promise.resolve(memStore.get(k) ?? null),
    set:         (k, v)     => { memStore.set(k, v); return Promise.resolve('OK'); },
    setex:       (k, ttl, v)=> { memStore.set(k, v); setTimeout(() => memStore.delete(k), ttl * 1000); return Promise.resolve('OK'); },
    del:         (k)        => { memStore.delete(k); return Promise.resolve(1); },
    incr:        (k)        => { const n = (memStore.get(k) || 0) + 1; memStore.set(k, n); return Promise.resolve(n); },
    expire:      ()         => Promise.resolve(1),
    duplicate:   function()  { return this; },
    status:      'ready',
    on:          () => {},
  });

  redis = makeShim();
  pub   = makeShim();
  sub   = makeShim();

  logger.warn('[Redis] No REDIS_URL — using in-memory shim (dev only, NOT for production)');
}

const getRedis = () => redis;

module.exports = { redis, pub, sub, getRedis };
