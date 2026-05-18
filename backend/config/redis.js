const { createClient } = require("redis");

let client;

async function testRedisConnection() {
  const pong = await getRedis().ping();
  if (pong !== "PONG") {
    throw new Error("Redis ping failed");
  }
}

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  client = createClient({ url });
  client.on("error", (err) => console.error("Redis error:", err.message));
  await client.connect();
}

function getRedis() {
  if (!client) {
    throw new Error("Redis client not initialized");
  }
  return client;
}


module.exports = { getRedis, connectRedis, testRedisConnection };
