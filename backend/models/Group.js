const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 300 },
    category: {
      type: String,
      enum: ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'],
      default: 'Other',
    },
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
