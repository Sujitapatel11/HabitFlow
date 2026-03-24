const mongoose = require('mongoose');

// Stores issued refresh tokens so we can revoke them (logout, rotation)
const refreshTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the raw token
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // TTL index auto-deletes
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
