const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 300 },
    category:  {
      type: String,
      enum: ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'],
      default: 'Other',
    },
    frequency: { type: String, enum: ['daily','weekly'], default: 'daily' },
    completed: { type: Boolean, default: false },
    streak:    { type: Number, default: 0, min: 0 },
    lastCompletedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast per-user queries + leaderboard
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ userId: 1, streak: -1 });

module.exports = mongoose.model('Habit', habitSchema);
