const User = require("../models/User");
const Guest = require("../models/Guest");
const facilitator = require("../lib/x402");

module.exports.checkCredits = async function (req, res, next) {
  const chatSession = req.chatSession;
  const creditsRequired = chatSession.models.length;
  let user;

  if (req.session.userId) {
    user = await User.findById(req.session.userId);
  } else if (req.session.guestId) {
    user = await Guest.findById(req.session.guestId);
  } else {
    return res.status(404).json({ error: "User session does not exist" });
  }

  if (creditsRequired <= user.credits) {
    req.user = user;
    return next();
  }

  const creditsMissing = creditsRequired - user.credits;

  const paymentReq = facilitator.createPaymentRequest({
    amount: creditsMissing,
    currency: "CREDITS",
    metadata: {
      userId: user._id.toString(),
    },
  });

  user.pendingPayment = {
    reference: paymentReq.reference,
    amount: creditsMissing,
    createdAt: new Date(),
  };
  await user.save();

  return facilitator.paymentRequired(res, paymentReq);
};
