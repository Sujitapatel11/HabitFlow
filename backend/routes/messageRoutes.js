const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getConversation, getThreads, reactToMessage } = require('../controllers/messageController');

router.get('/threads', protect, getThreads);
router.get('/conversation', protect, getConversation);
router.patch('/:id/react', protect, reactToMessage);

module.exports = router;
