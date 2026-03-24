const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, forgotPassword, verifyOtp, resetPassword } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');

router.post('/register',       authLimiter, validate(schemas.register),       register);
router.post('/login',          authLimiter, validate(schemas.login),           login);
router.post('/refresh',        authLimiter,                                    refresh);
router.post('/logout',                                                         logout);
router.post('/forgot-password',authLimiter, validate(schemas.forgotPassword),  forgotPassword);
router.post('/verify-otp',     authLimiter,                                    verifyOtp);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword),   resetPassword);

module.exports = router;
