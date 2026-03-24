const logger = require('../services/logger');

const errorHandler = (err, req, res, next) => {
  // Log with stack in dev, message only in prod
  if (process.env.NODE_ENV === 'production') {
    logger.error(`[${req.method}] ${req.path} — ${err.message}`);
  } else {
    logger.error(err);
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join('; ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large' });
  }

  // Generic — never leak stack traces in production
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
