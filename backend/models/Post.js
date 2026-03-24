const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', index: true },
    authorName: { type: String, default: 'Anonymous' },
    habitName:  { type: String, required: true, trim: true },
    message:    { type: String, required: true, trim: true, maxlength: 500 },
    category:   { type: String, default: 'Other', index: true },
    type:       { type: String, enum: ['manual', 'completion'], default: 'manual' },
    reactions:  [{ userId: String, type: { type: String, enum: ['like', 'motivate'], default: 'like' } }],
  },
  { timestamps: true }
);

// Compound index for paginated community feed (most common query)
postSchema.index({ createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
