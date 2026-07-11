const path = require("path");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const router = require("./api/v1/data/shorten.js");
const { authRouter } = require("./api/v1/auth.js");
const { retrieveOriginalURL } = require("./services/urlResolver.js");
const { setTimingHeaders } = require("./utils/timingHeaders.js");
const rateLimitRedirect = require("./middleware/rateLimitRedirect.js");
const { getClientIp } = require("./services/rateLimit.js");
const { publishClickEvent } = require("./services/analytics.js");
const { createSessionMiddleware } = require("./config/session.js");
const { configurePassport } = require("./config/passport.js");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      credentials: true,
      exposedHeaders: [
        "Location",
        "Retry-After",
        "X-Resolve-Time-Ms",
        "X-Cache-Status",
      ],
    }),
  );
  app.use(express.json());

  app.use(createSessionMiddleware());
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (req, res) => {
    return res.status(200).json({
      success: true,
      data: {},
    });
  });

  // Auth before /:shortCode so /profile, /auth/* are not treated as short codes
  app.use(authRouter);
  app.use("/api/v1/data", router);

  // Frontend pages (login.html / playground.html) + shared assets
  const frontendDir = path.join(__dirname, "../frontend");
  app.get(["/login", "/login/"], (req, res) => {
    res.sendFile(path.join(frontendDir, "login.html"));
  });
  app.get(["/playground", "/playground/"], (req, res) => {
    res.sendFile(path.join(frontendDir, "playground.html"));
  });
  app.use(express.static(frontendDir));

  app.get("/:shortCode", rateLimitRedirect, async (req, res) => {
    try {
      const { row, resolveMs, cacheStatus } = await retrieveOriginalURL(
        req.params.shortCode,
      );
      setTimingHeaders(res, resolveMs, cacheStatus);
      if (!row) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ROUTE_NOT_FOUND",
            message: "Route not found",
            details: [],
          },
        });
      }
      publishClickEvent({
        shortCode: req.params.shortCode,
        clickedAt: new Date().toISOString(),
        clientIp: getClientIp(req),
        cacheStatus,
      });
      return res.redirect(302, row.longURL);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
            details: [],
          },
        });
      }
    }
  });

  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    const code = err.code || "INTERNAL_SERVER_ERROR";
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details: [],
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found",
        details: [],
      },
    });
  });

  return app;
}

module.exports = { createApp };
