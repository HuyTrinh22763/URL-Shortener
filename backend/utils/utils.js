const { pool } = require("../config/db.js");
const crypto = require("crypto");
const CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

async function checkUrlInDB(longURL, userId) {
  const [result] = await pool.query(
    "SELECT id, shortCode, created_at, user_id FROM urls WHERE longURL = ? AND user_id = ? LIMIT 1",
    [longURL, userId],
  );
  if (result.length > 0) {
    return result[0];
  }
  return null;
}

async function addUrlToDB(id, shortCode, longURL, userId) {
  const [result] = await pool.query(
    "INSERT INTO urls (id, user_id, shortCode, longURL) VALUES (?, ?, ?, ?)",
    [id, userId, shortCode, longURL],
  );
  if (result.affectedRows > 0) {
    return true;
  }
  return false;
}

async function updateOriginalURL(shortCode, newLongURL, userId) {
  await pool.query(
    "UPDATE urls SET longURL = ? WHERE shortCode = ? AND user_id = ?",
    [newLongURL, shortCode, userId],
  );
  const [rows] = await pool.query(
    "SELECT id, user_id, shortCode, longURL, created_at FROM urls WHERE shortCode = ? AND user_id = ? LIMIT 1",
    [shortCode, userId],
  );
  return rows[0] || null;
}

async function deleteRecord(shortCode, userId) {
  const [result] = await pool.query(
    "DELETE FROM urls WHERE shortCode = ? AND user_id = ?",
    [shortCode, userId],
  );
  if (result.affectedRows > 0) {
    return true;
  }
  return false;
}

function stringToBase62(num) {
  let res = "";
  if (num <= 0) {
    return res;
  }
  while (num) {
    res = CHARSET[num % 62] + res;
    num = Math.floor(num / 62);
  }
  return res;
}

function uniqueIdGenerator() {
  const id = Date.now() + crypto.randomInt(0, 10000000);
  return Number(id);
}

function verifyUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "longURL is required and must be a non-empty string",
    };
  }
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: "longURL must use http or https scheme",
      };
    }
    return { success: true, longURL: trimmed };
  } catch {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "longURL must be a valid URL",
    };
  }
}

module.exports = {
  checkUrlInDB,
  stringToBase62,
  uniqueIdGenerator,
  addUrlToDB,
  deleteRecord,
  updateOriginalURL,
  verifyUrl,
};
