const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { findOrCreateFromGoogle } = require("../../services/userService.js");

function createGoogleStrategy() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.PUBLIC_BASE_URL;

  if (!clientID || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  if (!baseUrl) {
    throw new Error("PUBLIC_BASE_URL must be set (used for OAuth callbackURL)");
  }

  return new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: `${baseUrl.replace(/\/$/, "")}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateFromGoogle(profile);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  );
}

module.exports = { createGoogleStrategy };
