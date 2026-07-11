require("dotenv").config();
const port = process.env.PORT || 3000;
const { testDbConnection } = require("./config/db.js");
const { connectRedis, testRedisConnection } = require("./config/redis.js");
const { connectProducer } = require("./config/kafka.js");
const { createApp } = require("./app.js");

// Tất cả chỉ chạy khi docker chạy
async function start() {
  try {
    // kiểm tra kết nối tới DB
    await testDbConnection();
    await connectRedis();
    // kiểm tra kết nối tới redis
    await testRedisConnection();
    try {
      // kiểm tra kết nối tới Kafka
      await connectProducer();
    } catch (e) {
      console.error("Kafka producer:", e.message);
    }

    // Session store needs Redis; create app only after connectRedis()
    const app = createApp();
    app.listen(port, () => {
      console.log(`Server started successfully on port ${port}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

start();
