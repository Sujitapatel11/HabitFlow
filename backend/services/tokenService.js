const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
const ACCESS_TTL     = '15m';
const REFRESH_TTL    = '7d';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

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

function setTokenCookies(res, userId, email) {
  const payload = { sub: userId, email };
  const access  = signAccess(payload);
  const refresh = signRefresh(payload);

  res.cookie('hf_access',  access,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('hf_refresh', refresh, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return { access, refresh };
}

function clearTokenCookies(res) {
  res.clearCookie('hf_access',  COOKIE_OPTS);
  res.clearCookie('hf_refresh', COOKIE_OPTS);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, setTokenCookies, clearTokenCookies };
