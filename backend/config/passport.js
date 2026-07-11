const passport = require("passport");
const { createGoogleStrategy } = require("../auth/strategy/google.js");
const { findById } = require("../services/userService.js");

function configurePassport() {
  passport.use(createGoogleStrategy());

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await findById(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  return passport;
}

module.exports = { configurePassport };
