const express = require("express");
const router = express.Router();
const { pool } = require("../../../config/db.js");
const {
  checkUrlInDB,
  stringToBase62,
  uniqueIdGenerator,
  addUrlToDB,
  updateOriginalURL,
  deleteRecord,
  verifyUrl,
} = require("../../../utils/utils.js");
const {
  setCachedUrl,
  invalidateCachedUrl,
} = require("../../../services/urlCache.js");
const { toShortenData } = require("../../../utils/shortenPayload.js");
const { setTimingHeaders } = require("../../../utils/timingHeaders.js");
const rateLimitCreate = require("../../../middleware/rateLimitCreate.js");
const ensureAuthenticated = require("../../../middleware/ensureAuthenticated.js");

router.use(ensureAuthenticated);

router.post("/shorten", rateLimitCreate, async (req, res) => {
  const t0 = performance.now();
  let cacheStatus = "-";
  try {
    const longURL = req.body["longURL"];

    const verified = verifyUrl(longURL);
    if (!verified.success) {
      setTimingHeaders(res, performance.now() - t0, cacheStatus);
      return res.status(400).json({
        success: false,
        error: {
          code: verified.code,
          message: verified.message,
          details: [],
        },
      });
    }

    const userId = req.user.id;
    const foundRecord = await checkUrlInDB(verified.longURL, userId);
    if (foundRecord) {
      cacheStatus = "SKIP";
      setTimingHeaders(res, performance.now() - t0, cacheStatus);
      return res.status(200).json({
        success: true,
        data: toShortenData({
          id: foundRecord.id,
          userId,
          shortCode: foundRecord.shortCode,
          createdAt: foundRecord.created_at,
        }),
      });
    }
    const uniqueID = uniqueIdGenerator();
    const shortCode = stringToBase62(uniqueID);
    const addURL = await addUrlToDB(uniqueID, shortCode, verified.longURL, userId);

    if (!addURL) {
      setTimingHeaders(res, performance.now() - t0, cacheStatus);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
          details: [],
        },
      });
    }
    const createdAt = new Date().toISOString();
    // Store in Redis Cache
    await setCachedUrl(shortCode, {
      id: uniqueID,
      longURL: verified.longURL,
      created_at: createdAt,
    });
    cacheStatus = "WARM";
    setTimingHeaders(res, performance.now() - t0, cacheStatus);
    return res.status(201).json({
      success: true,
      data: toShortenData({
        id: uniqueID,
        userId,
        shortCode,
        longURL: verified.longURL,
        createdAt,
      }),
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      setTimingHeaders(res, performance.now() - t0, cacheStatus);
      return res.status(500).json({
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

router.get("/shorten/:code/stats", async (req, res) => {
  try {
    const shortCode = req.params.code;
    const [urlRows] = await pool.query(
      "SELECT id FROM urls WHERE shortCode = ? AND user_id = ? LIMIT 1",
      [shortCode, req.user.id],
    );
    if (urlRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    const [stats] = await pool.query(
      "SELECT COUNT(*) AS clickCount, MAX(clickedAt) AS lastClickedAt FROM clicks WHERE shortCode = ?",
      [shortCode],
    );
    const row = stats[0];
    return res.status(200).json({
      success: true,
      data: {
        shortCode,
        clickCount: Number(row.clickCount) || 0,
        lastClickedAt: row.lastClickedAt
          ? new Date(row.lastClickedAt).toISOString()
          : null,
      },
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({
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

router.get("/shorten/:code", async (req, res) => {
  try {
    const shortCode = req.params.code;
    const [rows] = await pool.query(
      "SELECT id, longURL, created_at FROM urls WHERE shortCode = ? AND user_id = ? LIMIT 1",
      [shortCode, req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    const row = rows[0];
    return res.status(200).json({
      success: true,
      data: toShortenData({
        id: row.id,
        user_id: req.user.id,
        shortCode,
        longURL: row.longURL,
        createdAt: row.created_at,
      }),
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({
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

router.put("/shorten/:code", async (req, res) => {
  try {
    const shortCode = req.params.code;
    const newLongURL = req.body.longURL;
    const verified = verifyUrl(newLongURL);
    if (!verified.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: verified.code,
          message: verified.message,
          details: [],
        },
      });
    }

    const row = await updateOriginalURL(
      shortCode,
      verified.longURL,
      req.user.id,
    );
    if (!row) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    await invalidateCachedUrl(shortCode);
    await setCachedUrl(shortCode, {
      id: row.id,
      longURL: row.longURL,
      created_at: row.created_at,
    });
    return res.status(200).json({
      success: true,
      data: toShortenData({
        id: row.id,
        userId: req.user.id,
        shortCode,
        longURL: row.longURL,
        createdAt: row.created_at,
      }),
    });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({
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

router.delete("/shorten/:code", async (req, res) => {
  try {
    const shortCode = req.params.code;
    const deletedRecord = await deleteRecord(shortCode, req.user.id);
    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    // Delete key from Redis Cache
    await invalidateCachedUrl(shortCode);
    return res.status(204).end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({
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
module.exports = router;
