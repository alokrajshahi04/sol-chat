const Guest = require("../models/Guest");

module.exports.isAuthenticated = function (req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "User not logged in" });
};

module.exports.checkGuest = async function (req, res, next) {
  if (!req.session) {
    return res.status(404).json({ error: "User session does not exist" });
  }
  if (!req.session.userId && !req.session.guestId) {
    const guest = await Guest({ credits: 0 });
    await guest.save();
    req.session.guestId = guest._id;
  }
  next();
};
