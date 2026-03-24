const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    // Key by userId if authenticated, else by IP
    keyGenerator: (req) => {
      const userId = req.user?.sub;
      if (userId) return userId;
      // Normalize IPv6-mapped IPv4 addresses
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return ip.replace(/^::ffff:/, '');
    },
  });

// Auth endpoints — strict
const authLimiter = make(15 * 60 * 1000, 10, 'Too many auth attempts. Try again in 15 minutes.');

// Habit completion — max 50 per hour per user
const habitActionLimiter = make(60 * 60 * 1000, 50, 'Too many habit actions. Slow down.');

// Posting / messaging — 30 per 10 min
const postLimiter = make(10 * 60 * 1000, 30, 'Posting too fast. Please wait.');

// Witness votes — 20 per hour
const voteLimiter = make(60 * 60 * 1000, 20, 'Too many votes. Try again later.');

// General API — 300 per 15 min
const generalLimiter = make(15 * 60 * 1000, 300, 'Too many requests. Try again later.');

module.exports = { authLimiter, habitActionLimiter, postLimiter, voteLimiter, generalLimiter };
