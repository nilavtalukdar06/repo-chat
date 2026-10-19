import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { Status } from "@/generated/prisma/client";
import { producer } from "@/lib/kafka";
import { prisma } from "@/lib/prisma";
import { publishLog } from "@/utils/publish-log";

async function main() {
  await producer.connect();
  logger.info("connected producer");
  await publishLog("connected producer");

  await prisma.repository.update({
    where: { id: env.REPOSITORY_ID },
    data: { status: Status.INDEXED },
  });
  logger.info("updated repository status to indexed");
  await publishLog("updated repository status to indexed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.fatal(error);
    process.exit(1);
  });
