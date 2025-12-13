const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Authentication
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // Optional for OAuth users
    
    // OAuth provider info
    oauthProvider: { 
      type: String, 
      enum: ['local', 'google'],
      default: 'local'
    },
    oauthId: { type: String }, // Provider-specific user ID
    
    // Profile
    name: { type: String },
    avatar: { type: String },
    
    // Solana wallet integration
    solanaWallet: { type: String }, // User's Solana public key
    tokenAccount: { type: String }, // Associated token account for credits
    
    // Delegate authority - backend wallet can spend user's credits
    delegateAuthorized: { type: Boolean, default: false },
    delegateAmount: { type: Number, default: 0 }, // Max credits backend can spend
    
    // Pending payment for x402 flow
    pendingPayment: {
      reference: { type: String },
      amount: { type: Number }, // Amount in lamports
      credits: { type: Number }, // Credits to mint after payment
      createdAt: { type: Date },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Virtual for checking if user has connected wallet
UserSchema.virtual('hasWallet').get(function() {
  return !!this.solanaWallet;
});

// Index for OAuth lookups
UserSchema.index({ oauthProvider: 1, oauthId: 1 });

const User = mongoose.model('User', UserSchema);

module.exports = User;
