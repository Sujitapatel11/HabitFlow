const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const appUserSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    goalCategory: {
      type: String,
      enum: ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'],
      default: 'Other',
    },
    bio:    { type: String, default: '', maxlength: 200 },
    streak: { type: Number, default: 0, min: 0 },
    xp:     { type: Number, default: 0, min: 0 },  // server-authoritative, never set by client
    avatar: { type: String, default: '' },
    // Reputation score for leaderboard weighting (0–100)
    reputationScore: { type: Number, default: 50, min: 0, max: 100 },

    // ── PledgeUp additions ────────────────────────────────────────────────
    isPro:       { type: Boolean, default: false },
    proExpiresAt: { type: Date, default: null },

    // Permanent broken pledge record (reputation tier — never deleted)
    brokenPledges: [{
      habitName:    String,
      durationDays: Number,
      brokenOnDay:  Number,
      brokenAt:     { type: Date, default: Date.now },
      tier:         { type: String, enum: ['honor','reputation','stakes'], default: 'honor' },
    }],

    // Lockout: user cannot create new pledges until this date
    lockoutUntil: { type: Date, default: null },

    // Earned title from pledge completions
    pledgeTitle: { type: String, default: 'Newcomer' },

    // Stripe customer ID for Stakes tier
    stripeCustomerId: { type: String, default: '' },
    // OTP fields
    resetOtp:       { type: String, default: null, select: false },
    resetOtpExpiry: { type: Date,   default: null, select: false },
    // Email verification
    isVerified:         { type: Boolean, default: false },
    verifyToken:        { type: String,  default: null, select: false },
    verifyTokenExpiry:  { type: Date,    default: null, select: false },
    // Brute-force lockout
    loginAttempts: { type: Number, default: 0, select: false },
    lockoutUntil:  { type: Date,   default: null, select: false },
    // Abuse control
    isBanned:   { type: Boolean, default: false },
    banReason:  { type: String, default: '' },
    trustTier:  { type: String, enum: ['CLEAN','WATCH','SHADOW','GHOST'], default: 'CLEAN', select: false },
  },
  { timestamps: true }
);

appUserSchema.index({ goalCategory: 1 });
appUserSchema.index({ streak: -1 });
appUserSchema.index({ xp: -1 });
appUserSchema.index({ reputationScore: -1 });

// Hash password before save
appUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12); // bumped to 12 rounds
});

appUserSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never leak password/OTP fields in JSON responses
appUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetOtp;
  delete obj.resetOtpExpiry;
  return obj;
};

module.exports = mongoose.model('AppUser', appUserSchema);
