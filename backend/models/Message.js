const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    text:       { type: String, required: true, maxlength: 2000 },
    read:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound indexes for fast conversation lookup and thread aggregation
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 }); // unread count queries
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
