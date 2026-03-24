const Joi = require('joi');

// Generic validator middleware factory
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    const msg = error.details.map(d => d.message).join('; ');
    return res.status(400).json({ success: false, message: msg });
  }
  req[source] = value; // replace with sanitized value
  next();
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'];

const schemas = {
  register: Joi.object({
    name:         Joi.string().trim().min(2).max(60).required(),
    email:        Joi.string().email().lowercase().trim().required(),
    password:     Joi.string().min(6).max(128).required(),
    goalCategory: Joi.string().valid(...CATEGORIES).default('Other'),
    bio:          Joi.string().max(200).allow('').default(''),
  }),

  login: Joi.object({
    email:    Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),

  resetPassword: Joi.object({
    email:       Joi.string().email().lowercase().trim().required(),
    otp:         Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: Joi.string().min(6).max(128).required(),
  }),

  createHabit: Joi.object({
    name:        Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().max(300).allow('').default(''),
    category:    Joi.string().valid(...CATEGORIES).default('Other'),
    frequency:   Joi.string().valid('daily','weekly').default('daily'),
  }),

  createContract: Joi.object({
    habitId:      Joi.string().hex().length(24).required(),
    habitName:    Joi.string().trim().max(100).required(),
    category:     Joi.string().valid(...CATEGORIES).default('Other'),
    durationDays: Joi.number().integer().min(1).max(365).required(),
    stakePoints:  Joi.number().integer().min(10).max(500).required(),
  }),

  checkIn: Joi.object({
    note: Joi.string().max(500).allow('').default(''),
  }),

  witnessVote: Joi.object({
    vote: Joi.string().valid('legit','doubt').required(),
  }),

  sendMessage: Joi.object({
    toUserId: Joi.string().hex().length(24).required(),
    text:     Joi.string().trim().min(1).max(2000).required(),
  }),

  updateProfile: Joi.object({
    name:         Joi.string().trim().min(2).max(60),
    bio:          Joi.string().max(200).allow(''),
    goalCategory: Joi.string().valid(...CATEGORIES),
  }),
};

module.exports = { validate, schemas };
