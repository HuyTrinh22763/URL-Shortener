const { pool } = require("../config/db.js");

async function retrieveOriginalURL(shortCode) {
  // mỗi redirect/metadata hit MySQL — cache Redis tại đây
  const [result] = await pool.query(
    "SELECT id, longURL, created_at FROM urls WHERE shortCode = ?",
    [shortCode],
  );
  if (result.length === 0) {
    return null;
  }
  return result[0];
}

module.exports = { retrieveOriginalURL };
