const path = require("path");
const express = require("express");
const app = express();
const router = require("./api/v1/data/shorten.js");
const { retrieveOriginalURL } = require("./services/urlResolver.js");
const { setTimingHeaders } = require("./utils/timingHeaders.js");
const rateLimitRedirect = require("./middleware/rateLimitRedirect.js");
const cors = require("cors");

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

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    data: {},
  });
});

app.use("/api/v1/data", router);

// same-origin playground — redirect manual cần đọc được Location
app.use("/playground", express.static(path.join(__dirname, "../frontend")));

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
    // Syntax to redirect to a given URL
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

module.exports = app;
