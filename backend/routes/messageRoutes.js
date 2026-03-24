const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getConversation, getThreads } = require('../controllers/messageController');

// All message routes require authentication
router.get('/threads', protect, getThreads);
router.get('/conversation', protect, getConversation);

// Legacy routes kept for backward compat (deprecated — use /conversation?with=)
router.get('/:userId/threads', protect, getThreads);
router.get('/:userId', protect, getConversation);

module.exports = router;
