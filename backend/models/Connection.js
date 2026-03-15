const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// Prevent duplicate connection requests
connectionSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);
