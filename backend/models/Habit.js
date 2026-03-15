const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 300 },
    category: {
      type: String,
      enum: ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'],
      default: 'Other',
    },
    completed: { type: Boolean, default: false },
    streak: { type: Number, default: 0 },
    lastCompletedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Habit', habitSchema);
