module.exports.isAuthenticated = function (req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: "User not logged in" });
};
