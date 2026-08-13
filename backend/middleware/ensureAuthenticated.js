function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: {
      code: "AUTH UNAUTHORIZED",
      message: "Auth unauthorized",
      details: [],
    },
  });
}

module.exports = ensureAuthenticated;
