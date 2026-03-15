const express = require('express');
const router = express.Router();
const { getHabits, createHabit, updateHabit, deleteHabit } = require('../controllers/habitController');

router.get('/', getHabits);
router.post('/', createHabit);
router.put('/:id', updateHabit);
router.delete('/:id', deleteHabit);

module.exports = router;
