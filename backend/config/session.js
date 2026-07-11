const session = require("express-session");
const { RedisStore } = require("connect-redis");
const { getRedis } = require("./redis.js");

function createSessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }

  return session({
    store: new RedisStore({
      client: getRedis(),
      prefix: "session:",
    }),
    secret,
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  });
}

module.exports = { createSessionMiddleware };
