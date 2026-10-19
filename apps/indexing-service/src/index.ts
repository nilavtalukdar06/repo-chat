import { env } from "@/config/env";
import { logger } from "@/config/logger";

async function main() {
  logger.info(`indexing-service starting in ${env.NODE_ENV} mode`);

  logger.info("indexing-service finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.fatal(error);
    process.exit(1);
  });
