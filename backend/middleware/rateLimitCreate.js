const {
  checkSlidingWindow,
  getClientIp,
  ipToKeyPart,
  readLimitConfig,
} = require("../services/rateLimit.js");

const POLICY = "create";

async function rateLimitCreate(req, res, next) {
  try {
    const { windowMs, max } = readLimitConfig(
      "RATE_LIMIT_CREATE_WINDOW_MS",
      "RATE_LIMIT_CREATE_MAX",
      { windowMs: 60_000, max: 40 },
    );
    const result = await checkSlidingWindow(
      ipToKeyPart(getClientIp(req)),
      POLICY,
      windowMs,
      max,
    );
    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          details: [{ retryAfter: result.retryAfter }],
        },
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = rateLimitCreate;
