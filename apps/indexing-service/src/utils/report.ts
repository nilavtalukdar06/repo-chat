import { logger } from "@/config/logger";
import { publishLog } from "@/utils/publish-log";

export async function report(message: string) {
  logger.info(message);
  await publishLog(message);
}
