const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
const ACCESS_TTL     = '15m';
const REFRESH_TTL    = '7d';

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Generate both tokens and return them.
 * Tokens are returned in the response body — no cookies.
 * This works reliably across all environments (dev proxy, cross-origin, mobile).
 */
function createTokens(userId, email) {
  const payload = { sub: userId, email };
  return {
    access:  signAccess(payload),
    refresh: signRefresh(payload),
  };
}

// Keep cookie helpers as no-ops for backward compat (production migration path)
function setTokenCookies(res, userId, email) {
  return createTokens(userId, email);
}

function clearTokenCookies(res) {
  // no-op — tokens are in client storage, not cookies
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, createTokens, setTokenCookies, clearTokenCookies };
