const { X402Facilitator } = require("x402-express");

const facilitator = new X402Facilitator({
  paymentProvider: "solana",
  receiverAddress: process.env.SOL_RECEIVER_WALLET,
  cluster: "devnet",
});

module.exports = facilitator;
