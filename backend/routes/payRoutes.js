const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Guest = require("../models/Guest");
const facilitator = require("../lib/x402");

router.post("/verify", async (req, res) => {
  if (!req.session) {
    return res.status(404).json({ error: "User session does not exist" });
  }

  let user;
  if (req.session.userId) {
    user = await User.findById(req.session.userId);
  } else if (req.session.guestId) {
    user = await Guest.findById(req.session.guestId);
  } else {
    return res.status(404).json({ error: "User session does not exist" });
  }

  if (!user.pendingPayment) {
    return res.status(400).json({ error: "No Pending Payment" });
  }

  const { reference, amount } = user.pendingPayment;

  const result = await facilitator.verifyPayment({
    reference,
    expectedAmount: amount,
  });

  if (!result.verified) {
    return res
      .status(400)
      .json({ error: "Payment not found", details: result });
  }

  user.credits += amount;
  user.pendingPayment = null;
  await user.save();

  res.status(200).json({
    ok: true,
    creditsAdded: amount,
    totalCredits: user.credits,
    txSignature: result.signature,
  });
});

module.exports = router;
