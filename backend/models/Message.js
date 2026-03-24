const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji:  { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    text:       { type: String, required: true, maxlength: 2000 },
    read:       { type: Boolean, default: false },
    reactions:  { type: [reactionSchema], default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
