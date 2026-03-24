const { verifyAccess } = require('../services/tokenService');
const logger = require('../services/logger');

/**
 * protect — reads JWT from HTTP-only cookie (hf_access).
 * Falls back to Authorization: Bearer header for API clients / mobile.
 * Attaches req.user = { sub, email } on success.
 */
const protect = (req, res, next) => {
  try {
    // 1. Cookie (browser)
    let token = req.cookies?.hf_access;

    // 2. Bearer header fallback (Postman / mobile)
    if (!token) {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) token = auth.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = verifyAccess(token);
    req.user = decoded; // { sub: userId, email, iat, exp }
    next();
  } catch (err) {
    logger.warn(`[Auth] Token rejected: ${err.message} — ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

/**
 * requireOwner(paramField) — ensures req.user.sub matches a route param.
 * Usage: router.put('/:userId/...', protect, requireOwner('userId'), handler)
 */
const requireOwner = (paramField = 'userId') => (req, res, next) => {
  if (req.user.sub !== req.params[paramField]) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

module.exports = { protect, requireOwner };
