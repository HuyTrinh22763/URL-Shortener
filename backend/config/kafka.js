const { Kafka } = require("kafkajs");

let producer;

function isKafkaEnabled() {
  return process.env.KAFKA_ENABLED === "true";
}

async function connectProducer() {
  if (!isKafkaEnabled()) {
    return;
  }
  const brokers = process.env.KAFKA_BROKERS;
  if (!brokers) {
    throw new Error("KAFKA_BROKERS is not set");
  }
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "url-shortener-api",
    brokers: brokers.split(",").map((b) => b.trim()),
  });
  producer = kafka.producer();
  await producer.connect();
}

function getProducer() {
  if (!producer) {
    throw new Error("Kafka producer not initialized");
  }
  return producer;
}

module.exports = { connectProducer, getProducer, isKafkaEnabled };
