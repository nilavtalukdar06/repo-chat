import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";
import { env } from "@/config/env";

export const kafka = new Kafka({
  clientId: "docker-indexing-server",
  brokers: [env.KAFKA_BROKER],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "../../ca.pem"), "utf-8")],
  },
  sasl: {
    username: env.KAFKA_USERNAME,
    password: env.KAFKA_PASSWORD,
    mechanism: "plain",
  },
});

export const producer = kafka.producer();
