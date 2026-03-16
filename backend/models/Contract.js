const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    userId:      { type: String, required: true },
    userName:    { type: String, required: true },
    habitId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', required: true },
    habitName:   { type: String, required: true },
    category:    { type: String, default: 'Other' },
    durationDays:{ type: Number, required: true, min: 1, max: 365 },
    stakePoints: { type: Number, required: true, min: 10, max: 500 },
    startDate:   { type: Date, default: Date.now },
    endDate:     { type: Date, required: true },
    status:      { type: String, enum: ['active', 'completed', 'broken'], default: 'active' },
    completedDays: { type: Number, default: 0 },
    // Witness votes on each check-in
    witnesses: [{
      userId:    String,
      userName:  String,
      vote:      { type: String, enum: ['legit', 'doubt'] },
      votedAt:   { type: Date, default: Date.now },
    }],
    // Daily check-ins
    checkIns: [{
      date:       { type: Date, default: Date.now },
      note:       { type: String, default: '' },
      verified:   { type: Boolean, default: false },
      doubtCount: { type: Number, default: 0 },
      legitCount: { type: Number, default: 0 },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contract', contractSchema);
