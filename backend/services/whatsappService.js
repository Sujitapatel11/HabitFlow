const twilio = require('twilio');

/**
 * Sends a WhatsApp reminder via Twilio.
 * Client is initialized lazily so missing credentials don't crash the server.
 */
const sendWhatsAppReminder = async (to, message) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !sid.startsWith('AC')) {
    throw new Error('Twilio not configured. Add TWILIO_ACCOUNT_SID to .env');
  }

  const client = twilio(sid, token);
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: formattedTo,
    body: message,
  });
};

module.exports = { sendWhatsAppReminder };
