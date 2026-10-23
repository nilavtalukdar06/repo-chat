import { Kafka, type KafkaConfig } from "kafkajs";
import fs from "fs";
import path from "path";
import { env } from "@/config/env";

const kafkaConfig: KafkaConfig = {
  clientId: "repository-service-consumer",
  brokers: [env.KAFKA_BROKER],
};

if (env.KAFKA_SSL) {
  kafkaConfig.ssl = {
    ca: [fs.readFileSync(path.join(process.cwd(), "ca.pem"), "utf-8")],
  };
}

if (env.KAFKA_SASL) {
  kafkaConfig.sasl = {
    username: env.KAFKA_USERNAME ?? "",
    password: env.KAFKA_PASSWORD ?? "",
    mechanism: "plain",
  };
}

const kafka = new Kafka(kafkaConfig);

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
