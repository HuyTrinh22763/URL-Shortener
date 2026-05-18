const express = require("express");
const router = express.Router();
const {
  checkUrlInDB,
  stringToBase62,
  uniqueIdGenerator,
  addUrlToDB,
  updateOriginalURL,
  deleteRecord,
  verifyUrl,
} = require("../../../utils/utils.js");
const { retrieveOriginalURL } = require("../../../services/urlResolver.js");
const {
  setCachedUrl,
  invalidateCachedUrl,
} = require("../../../services/urlCache.js");
const { toShortenData } = require("../../../utils/shortenPayload.js");

router.post("/shorten", async (req, res) => {
  try {
    const longURL = req.body["longURL"];

    const verified = verifyUrl(longURL);
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

    const foundRecord = await checkUrlInDB(verified.longURL);
    if (foundRecord) {
      return res.status(200).json({
        success: true,
        data: toShortenData({
          id: foundRecord.id,
          shortCode: foundRecord.shortCode,
          createdAt: foundRecord.created_at,
        }),
      });
    }
    const uniqueID = uniqueIdGenerator();
    const shortCode = stringToBase62(uniqueID);
    const addURL = await addUrlToDB(uniqueID, shortCode, verified.longURL);

    if (!addURL) {
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
    return res.status(201).json({
      success: true,
      data: toShortenData({
        id: uniqueID,
        shortCode,
        longURL: verified.longURL,
        createdAt,
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

router.get("/shorten/:code", async (req, res) => {
  try {
    const shortCode = req.params.code;
    const found = await retrieveOriginalURL(shortCode);
    if (!found) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    return res.status(200).json({
      success: true,
      data: toShortenData({
        id: found.id,
        shortCode,
        longURL: found.longURL,
        createdAt: found.created_at,
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

    const found = await retrieveOriginalURL(shortCode);
    if (!found) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    const result = await updateOriginalURL(shortCode, verified.longURL);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: {
          code: "UPDATE_FAILURE",
          message: "Failed to update new URL",
          details: [],
        },
      });
    }
    await invalidateCachedUrl(shortCode);
    await setCachedUrl(shortCode, {
      id: found.id,
      longURL: verified.longURL,
      created_at: found.created_at,
    });
    return res.status(200).json({
      success: true,
      data: toShortenData({
        id: found.id,
        shortCode,
        longURL: verified.longURL,
        createdAt: found.created_at,
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
    const found = await retrieveOriginalURL(shortCode);
    if (!found) {
      return res.status(404).json({
        success: false,
        error: {
          code: "URL_NOT_FOUND",
          message: "Original url not found",
          details: [],
        },
      });
    }
    // Delete record from Relational DB
    const deletedRecord = await deleteRecord(shortCode);
    if (!deletedRecord) {
      return res.status(400).json({
        success: false,
        error: {
          code: "DELETE_FAILURE",
          message: "Delete failure",
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
