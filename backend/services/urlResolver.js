const { pool } = require("../config/db.js");
const { getCachedUrl, setCachedUrl } = require("./urlCache.js");

async function retrieveOriginalURL(shortCode) {
  const cached = await getCachedUrl(shortCode);
  if (cached) {
    console.log("CACHE HIT");
    return cached;
  }

  // cache miss — query MySQL
  console.log("CACHE MISS");
  const [result] = await pool.query(
    "SELECT id, longURL, created_at FROM urls WHERE shortCode = ?",
    [shortCode],
  );
  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  await setCachedUrl(shortCode, row);
  return row;
}

module.exports = { retrieveOriginalURL };
