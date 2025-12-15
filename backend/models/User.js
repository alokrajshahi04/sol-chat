const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  oauthProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  oauthId: { type: String },
  name: { type: String },
  avatar: { type: String },
  solanaWallet: { type: String },
  tokenAccount: { type: String },
  credits: { type: Number, default: 0 },
  delegateAuthorized: { type: Boolean, default: false },
  delegateAmount: { type: Number, default: 0 },
  pendingPayment: {
    reference: String,
    amount: Number,
    credits: Number,
    createdAt: Date,
    expiresAt: Date,
  },
}, { timestamps: true });

UserSchema.virtual('hasWallet').get(function () {
  return !!this.solanaWallet;
});

UserSchema.index({ oauthProvider: 1, oauthId: 1 });

module.exports = mongoose.model('User', UserSchema);
