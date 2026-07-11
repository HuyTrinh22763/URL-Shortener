const { pool } = require("../config/db.js");

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, google_id, email, display_name, avatar_url, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return mapUserRow(rows[0]);
}

async function findByGoogleId(googleId) {
  const [rows] = await pool.query(
    `SELECT id, google_id, email, display_name, avatar_url, created_at, updated_at
     FROM users WHERE google_id = ? LIMIT 1`,
    [googleId],
  );
  return mapUserRow(rows[0]);
}

async function findOrCreateFromGoogle(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value ?? null;
  const displayName = profile.displayName ?? null;
  const avatarUrl = profile.photos?.[0]?.value ?? null;

  const existing = await findByGoogleId(googleId);
  if (existing) {
    await pool.query(
      `UPDATE users
       SET email = ?, display_name = ?, avatar_url = ?
       WHERE id = ?`,
      [email, displayName, avatarUrl, existing.id],
    );
    return findById(existing.id);
  }

  const [result] = await pool.query(
    `INSERT INTO users (google_id, email, display_name, avatar_url)
     VALUES (?, ?, ?, ?)`,
    [googleId, email, displayName, avatarUrl],
  );
  return findById(result.insertId);
}

module.exports = {
  findById,
  findByGoogleId,
  findOrCreateFromGoogle,
};
