import { createServer } from "node:http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { startLogConsumer, stopLogConsumer } from "./logs/run-consumer";

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(`server is running on port ${env.PORT}`);
});

await startLogConsumer();

async function shutDown(signal: string) {
  logger.info(`${signal} received`);
  await stopLogConsumer();
  server.close(() => {
    logger.info("server closed");
    process.exit(0);
  });
}

process.on("SIGINT", async () => await shutDown("SIGINT"));
process.on("SIGTERM", async () => await shutDown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.fatal(error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.fatal(error);
  process.exit(1);
});
