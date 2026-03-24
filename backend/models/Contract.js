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

    // ── PledgeUp tiers ────────────────────────────────────────────────────
    // honor   = reputation stake only (free)
    // reputation = permanent broken record on profile (free)
    // stakes  = monetary escrow via Stripe (Pro)
    tier: { type: String, enum: ['honor', 'reputation', 'stakes'], default: 'honor' },

    // Monetary stake (stakes tier only)
    stakeAmount:     { type: Number, default: 0, min: 0 },   // USD cents
    charityName:     { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    stripeEscrowStatus: {
      type: String,
      enum: ['none', 'held', 'released_charity', 'released_back'],
      default: 'none',
    },

    // Public pledge page — sparse index defined below, not inline
    publicSlug:   { type: String },
    isPublic:     { type: Boolean, default: true },

    // Invited witnesses (email invites for non-users)
    invitedWitnesses: [{
      email:     { type: String },
      name:      { type: String },
      accepted:  { type: Boolean, default: false },
      invitedAt: { type: Date, default: Date.now },
    }],

    // Challenge link — links two pledges together
    challengedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser', default: null },
    challengePairId: { type: String, default: null }, // shared ID for challenge pairs

    witnesses: [{
      userId:   { type: String, required: true },
      userName: String,
      vote:     { type: String, enum: ['legit','doubt'] },
      weight:   { type: Number, default: 1 },
      votedAt:  { type: Date, default: Date.now },
    }],
    checkIns: [{
      date:       { type: Date, default: Date.now },
      note:       { type: String, default: '', maxlength: 500 },
      proofUrl:   { type: String, default: '' },  // Cloudinary URL for photo proof
      verified:   { type: Boolean, default: false },
      doubtCount: { type: Number, default: 0 },
      legitCount: { type: Number, default: 0 },
    }],
  },
  { timestamps: true }
);

contractSchema.index({ userId: 1, status: 1 });
contractSchema.index({ publicSlug: 1 }, { unique: true, sparse: true });
contractSchema.index({ challengePairId: 1 });

module.exports = mongoose.model('Contract', contractSchema);
