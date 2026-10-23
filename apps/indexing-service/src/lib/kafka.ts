import { Kafka, type KafkaConfig } from "kafkajs";
import fs from "fs";
import path from "path";
import { env } from "@/config/env";

const kafkaConfig: KafkaConfig = {
  clientId: "docker-indexing-server",
  brokers: [env.KAFKA_BROKER],
};

if (env.KAFKA_SSL) {
  kafkaConfig.ssl = {
    ca: [fs.readFileSync(path.join(__dirname, "../ca.pem"), "utf-8")],
  };
}

if (env.KAFKA_SASL) {
  kafkaConfig.sasl = {
    username: env.KAFKA_USERNAME ?? "",
    password: env.KAFKA_PASSWORD ?? "",
    mechanism: "plain",
  };
}

export const kafka = new Kafka(kafkaConfig);

export const producer = kafka.producer();
