const express = require('express');
const router = express.Router();
const { getHabits, createHabit, completeHabit, undoHabit, updateHabit, deleteHabit } = require('../controllers/habitController');
const { protect } = require('../middleware/auth');
const { habitActionLimiter } = require('../middleware/rateLimiter');
const { shadowGate } = require('../middleware/antiCheat');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.get('/',                                                                       getHabits);
router.post('/',          validate(schemas.createHabit),                              createHabit);
router.put('/:id', validate(schemas.updateHabit), updateHabit);
router.post('/:id/complete', habitActionLimiter, shadowGate('complete'),              completeHabit);
router.post('/:id/undo',     habitActionLimiter, shadowGate('undo'),                  undoHabit);
router.delete('/:id',                                                                 deleteHabit);

module.exports = router;
