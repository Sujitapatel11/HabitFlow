const express = require('express');
const router = express.Router();
const { registerUser, getAllUsers, getSimilarUsers, syncStreak } = require('../controllers/appUserController');

router.post('/', registerUser);
router.get('/', getAllUsers);
router.get('/similar', getSimilarUsers);
router.patch('/:id/streak', syncStreak);

module.exports = router;
