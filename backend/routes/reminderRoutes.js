const express = require('express');
const router = express.Router();
const { sendReminder, sendSingleReminder } = require('../controllers/reminderController');

// Send WhatsApp reminder for all pending habits
router.post('/whatsapp', sendReminder);

// Send WhatsApp reminder for a single habit
router.post('/whatsapp/single', sendSingleReminder);

module.exports = router;
