const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testDbConnection() {
  const conn = await pool.getConnection(); // Hiện tại đang mượn một connection từ pool
  try {
    await conn.ping(); // Check if the server is available
  } finally {
    conn.release(); // Nhả connection mượn từ pool ra, thông báo rằng connection này hiện đang rảnh
  }
}

module.exports = { pool, testDbConnection };
