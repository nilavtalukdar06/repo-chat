import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";
import { env } from "@/config/env";

const kafka = new Kafka({
  clientId: "repository-service-consumer",
  brokers: [env.KAFKA_BROKER],
  ssl: {
    ca: [fs.readFileSync(path.join(process.cwd(), "ca.pem"), "utf-8")],
  },
  sasl: {
    username: env.KAFKA_USERNAME,
    password: env.KAFKA_PASSWORD,
    mechanism: "plain",
  },
});

export const consumer = kafka.consumer({ groupId: "repository-service-logs" });

let isConnected = false;

consumer.on(consumer.events.CONNECT, () => {
  isConnected = true;
});
consumer.on(consumer.events.DISCONNECT, () => {
  isConnected = false;
});
consumer.on(consumer.events.CRASH, () => {
  isConnected = false;
});

export function isKafkaHealthy() {
  return isConnected;
}
