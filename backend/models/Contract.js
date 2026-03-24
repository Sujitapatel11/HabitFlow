const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', required: true, index: true },
    userName:     { type: String, required: true },
    habitId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    habitName:    { type: String, required: true },
    category:     { type: String, default: 'Other' },
    durationDays: { type: Number, required: true, min: 1, max: 365 },
    stakePoints:  { type: Number, required: true, min: 10, max: 500 },
    startDate:    { type: Date, default: Date.now },
    endDate:      { type: Date, required: true },
    status:       { type: String, enum: ['active','completed','broken'], default: 'active', index: true },
    completedDays: { type: Number, default: 0 },
    witnesses: [{
      userId:   { type: String, required: true },
      userName: String,
      vote:     { type: String, enum: ['legit','doubt'] },
      weight:   { type: Number, default: 1 }, // reputation-based weight
      votedAt:  { type: Date, default: Date.now },
    }],
    checkIns: [{
      date:       { type: Date, default: Date.now },
      note:       { type: String, default: '', maxlength: 500 },
      verified:   { type: Boolean, default: false },
      doubtCount: { type: Number, default: 0 },
      legitCount: { type: Number, default: 0 },
    }],
  },
  { timestamps: true }
);

contractSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Contract', contractSchema);
