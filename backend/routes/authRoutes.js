const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "User Already Exists" });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const user = new User({ email, passwordHash });
  await user.save();

  req.session.userId = user._id;
  res.status(200).json({
    message: "User signed up",
    user: { id: user._id, email: user.email },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "Email or Password is Incorrect" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ error: "Email or Password is Incorrect" });
  }

  req.session.userId = user._id;
  res.status(200).json({
    message: "User logged in",
    user: {
      id: user._id,
      email: user.email,
    },
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: "Successfully Logged Out" });
  });
});

module.exports = router;
