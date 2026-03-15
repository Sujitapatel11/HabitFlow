const Habit = require('../models/Habit');
const { sendWhatsAppReminder } = require('../services/whatsappService');

/**
 * POST /api/reminders/whatsapp
 * Sends a WhatsApp reminder for all pending habits to a given phone number.
 */
const sendReminder = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Get all pending habits
    const pendingHabits = await Habit.find({ isCompleted: false });

    if (pendingHabits.length === 0) {
      return res.json({ success: true, message: 'No pending habits — all done!' });
    }

    const habitNames = pendingHabits.map((h) => `• ${h.name}`).join('\n');
    const message =
      `🔔 *HabitFlow Reminder*\n\n` +
      `You have *${pendingHabits.length}* pending habit(s) today:\n\n` +
      `${habitNames}\n\n` +
      `💪 Keep going — consistency is the key to success!`;

    await sendWhatsAppReminder(phone, message);

    res.json({
      success: true,
      message: `WhatsApp reminder sent to ${phone}`,
      habitCount: pendingHabits.length,
    });
  } catch (err) {
    // Twilio errors have a more specific message
    if (err.code) {
      return res.status(400).json({
        success: false,
        message: `Twilio error: ${err.message}`,
        code: err.code,
      });
    }
    next(err);
  }
};

/**
 * POST /api/reminders/whatsapp/single
 * Sends a WhatsApp reminder for a single specific habit.
 */
const sendSingleReminder = async (req, res, next) => {
  try {
    const { phone, habitId } = req.body;

    if (!phone || !habitId) {
      return res.status(400).json({ success: false, message: 'Phone and habitId are required' });
    }

    const habit = await Habit.findById(habitId);
    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const message =
      `⏰ *HabitFlow Reminder*\n\n` +
      `Don't forget your habit: *${habit.name}*\n\n` +
      `Category: ${habit.category}\n` +
      `${habit.description ? `📝 ${habit.description}\n\n` : ''}` +
      `You've got this! 🚀`;

    await sendWhatsAppReminder(phone, message);

    res.json({ success: true, message: `Reminder sent for "${habit.name}"` });
  } catch (err) {
    if (err.code) {
      return res.status(400).json({ success: false, message: `Twilio error: ${err.message}` });
    }
    next(err);
  }
};

module.exports = { sendReminder, sendSingleReminder };
