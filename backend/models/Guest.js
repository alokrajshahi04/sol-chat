const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema(
  {
    credits: { type: Number, default: 0 },
    pendingPayment: {
      reference: { type: String },
      amount: { type: Number },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

const Guest = mongoose.model("Guest", GuestSchema);

module.exports = Guest;
