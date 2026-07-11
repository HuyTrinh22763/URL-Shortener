const express = require("express");
const passport = require("passport");
const ensureAuthenticated = require("../../middleware/ensureAuthenticated.js");

const authRouter = express.Router();

authRouter.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=1" }),
  (req, res) => {
    res.redirect("/login");
  },
);

authRouter.get("/profile", ensureAuthenticated, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
    },
  });
});


authRouter.get("/api/v1/auth/me", ensureAuthenticated, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
    },
  });
});

authRouter.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("sid");
      res.status(200).json({ success: true, data: {} });
    });
  });
});

module.exports = { authRouter };
