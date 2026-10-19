import { logger } from "@/config/logger";
import { producer } from "./lib/kafka";
import { publishLog } from "./utils/publish-log";

export const REPOSITORY_ID = process.env.REPOSITORY_ID;
export const USER_ID = process.env.USER_ID;

async function main() {
  await producer.connect();
  logger.info("connected producer");
  await publishLog("connected producer");
  process.exit(0);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.fatal(error);
    process.exit(1);
  });
