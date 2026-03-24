const express = require('express');
const router = express.Router();
const { getHabits, createHabit, completeHabit, undoHabit, updateHabit, deleteHabit } = require('../controllers/habitController');
const { protect } = require('../middleware/auth');
const { habitActionLimiter } = require('../middleware/rateLimiter');
const { minGap, burstCheck } = require('../middleware/antiCheat');
const { validate, schemas } = require('../middleware/validate');

router.use(protect); // all habit routes require auth

router.get('/',                                                                    getHabits);
router.post('/',          validate(schemas.createHabit),                           createHabit);
router.put('/:id',        validate(schemas.createHabit.fork(['name'], s => s.optional())), updateHabit);
router.post('/:id/complete', habitActionLimiter, burstCheck, minGap('complete'),   completeHabit);
router.post('/:id/undo',     habitActionLimiter, burstCheck,                       undoHabit);
router.delete('/:id',                                                              deleteHabit);

module.exports = router;
