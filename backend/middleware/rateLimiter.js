const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    // Disable all built-in validations — we handle IP normalization ourselves
    validate: false,
    keyGenerator: (req) => {
      // Use authenticated userId when available for per-user limiting
      if (req.user?.sub) return req.user.sub;
      // Normalize IPv6-mapped IPv4 (::ffff:127.0.0.1 → 127.0.0.1)
      const ip = (req.ip || req.socket?.remoteAddress || 'unknown')
        .replace(/^::ffff:/, '');
      return ip;
    },
  });

const authLimiter        = make(15 * 60 * 1000,  20,  'Too many auth attempts. Try again in 15 minutes.');
const habitActionLimiter = make(60 * 60 * 1000,  50,  'Too many habit actions. Slow down.');
const postLimiter        = make(10 * 60 * 1000,  30,  'Posting too fast. Please wait.');
const voteLimiter        = make(60 * 60 * 1000,  20,  'Too many votes. Try again later.');
const generalLimiter     = make(15 * 60 * 1000,  300, 'Too many requests. Try again later.');

module.exports = { authLimiter, habitActionLimiter, postLimiter, voteLimiter, generalLimiter };
