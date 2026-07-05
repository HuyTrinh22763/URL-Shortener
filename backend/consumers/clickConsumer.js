require("dotenv").config();
const { Kafka } = require("kafkajs");
const { pool } = require("../config/db.js");

const topic = process.env.KAFKA_TOPIC_CLICKS || "url-clicks";
const groupId = process.env.KAFKA_GROUP_ID || "click-consumer";
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((b) => b.trim());

async function run() {
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "url-shortener-consumer",
    brokers,
  });
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const raw = message.value?.toString();
        if (!raw) {
          return;
        }
        const event = JSON.parse(raw);
        const clickedAt = new Date(event.clickedAt);
        await pool.query(
          "INSERT INTO clicks (shortCode, clickedAt, clientIp, cacheStatus) VALUES (?, ?, ?, ?)",
          [
            event.shortCode,
            clickedAt,
            event.clientIp || null,
            event.cacheStatus || null,
          ],
        );
      } catch (e) {
        console.error("clickConsumer:", e.message);
      }
    },
  });

  console.log(`clickConsumer subscribed to ${topic}`);
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
