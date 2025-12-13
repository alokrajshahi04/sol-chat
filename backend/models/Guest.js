const mongoose = require('mongoose');

const GuestSchema = new mongoose.Schema(
  {
    // Solana wallet integration (guests can also connect wallets)
    solanaWallet: { type: String },
    tokenAccount: { type: String }, // Associated token account for credits
    
    // Delegate authority - backend wallet can spend guest's credits
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
    
    // Session reference for cleanup
    sessionId: { type: String },
  },
  { timestamps: true }
);

// Virtual for checking if guest has connected wallet
GuestSchema.virtual('hasWallet').get(function() {
  return !!this.solanaWallet;
});

const Guest = mongoose.model('Guest', GuestSchema);

module.exports = Guest;
