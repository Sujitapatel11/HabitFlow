const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const appUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    goalCategory: {
      type: String,
      enum: ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'],
      default: 'Other',
    },
    bio: { type: String, default: '', maxlength: 200 },
    streak: { type: Number, default: 0 },
    resetOtp:        { type: String, default: null },
    resetOtpExpiry:  { type: Date,   default: null },
  },
  { timestamps: true }
);

appUserSchema.index({ goalCategory: 1 });

// Hash password before save
appUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password helper
appUserSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('AppUser', appUserSchema);
