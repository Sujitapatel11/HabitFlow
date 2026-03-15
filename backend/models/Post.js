const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorName: { type: String, default: 'Anonymous' },
    habitName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, default: 'Other' },
    type: { type: String, enum: ['manual', 'completion'], default: 'manual' },
    reactions: [{ userId: String, type: { type: String, enum: ['like', 'motivate'], default: 'like' } }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
