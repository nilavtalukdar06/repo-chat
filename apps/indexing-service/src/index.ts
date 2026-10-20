import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { Status } from "@/generated/prisma/client";
import { IndexingError, indexRepository } from "@/indexer/index-repository";
import { producer } from "@/lib/kafka";
import { prisma } from "@/lib/prisma";
import { publishLog } from "@/utils/publish-log";
import { report } from "@/utils/report";

function setStatus(status: Status) {
  return prisma.repository.update({
    where: { id: env.REPOSITORY_ID },
    data: { status },
  });
}

async function markFailed(error: unknown) {
  logger.error({ error }, "indexing failed");
  const reason =
    error instanceof IndexingError ? error.message : "an unexpected error";
  await publishLog(`indexing failed: ${reason}`).catch((publishError) =>
    logger.error({ error: publishError }, "failed to publish failure log"),
  );
  await setStatus(Status.FAILED).catch((statusError) =>
    logger.error({ error: statusError }, "failed to mark repository as failed"),
  );
}

async function main() {
  await producer.connect();
  await report("connected producer");
  try {
    await setStatus(Status.INDEXING);
    await report("updated repository status to indexing");
    await indexRepository(env.OUTPUT_DIR, {
      repositoryId: env.REPOSITORY_ID,
      userId: env.USER_ID,
    });
    await setStatus(Status.INDEXED);
    await report("updated repository status to indexed");
  } catch (error) {
    await markFailed(error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.fatal(error);
    process.exit(1);
  });
