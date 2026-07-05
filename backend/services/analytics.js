const { getProducer, isKafkaEnabled } = require("../config/kafka.js");

function clickTopic() {
  return process.env.KAFKA_TOPIC_CLICKS || "url-clicks";
}

function publishClickEvent(event) {
  if (!isKafkaEnabled()) {
    return;
  }
  try {
    const producer = getProducer();
    producer
      .send({
        topic: clickTopic(),
        messages: [
          {
            key: event.shortCode,
            value: JSON.stringify(event),
          },
        ],
      })
      .catch((err) => console.error("Kafka publish:", err.message));
  } catch (err) {
    console.error("Kafka publish:", err.message);
  }
}

module.exports = { publishClickEvent };
