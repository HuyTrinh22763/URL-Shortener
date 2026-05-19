const { pool } = require("../config/db.js");
const { getCachedUrl, setCachedUrl } = require("./urlCache.js");

async function retrieveOriginalURL(shortCode) {
  const t0 = performance.now();
  const cached = await getCachedUrl(shortCode);
  if (cached) {
    return {
      row: cached,
      resolveMs: performance.now() - t0,
      cacheStatus: "HIT",
    };
  }

  // cache MISS: query MySQL
  const [result] = await pool.query(
    "SELECT id, longURL, created_at FROM urls WHERE shortCode = ?",
    [shortCode],
  );
  if (result.length === 0) {
    return {
      row: null,
      resolveMs: performance.now() - t0,
      cacheStatus: "NONE",
    };
  }
  const row = result[0];
  await setCachedUrl(shortCode, row);
  return {
    row,
    resolveMs: performance.now() - t0,
    cacheStatus: "MISS",
  };
}

module.exports = { retrieveOriginalURL };
