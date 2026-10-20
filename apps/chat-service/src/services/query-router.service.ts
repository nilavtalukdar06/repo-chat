import { logger } from "@/config/logger";
import { routerPrompt } from "@/constants/prompts";
import { routerModel } from "@/lib/openai";
import type { Repository } from "@/services/repository.service";
import { generateText, Output } from "ai";
import { z } from "zod";

const ROUTER_TIMEOUT_MS = 8_000;

const strategySchema = z.object({
  strategy: z.enum(["direct", "rewrite", "hyde", "off_topic"]),
});

export type QueryStrategy = z.infer<typeof strategySchema>["strategy"];

export abstract class QueryRouterService {
  static async route(
    conversation: string,
    repository: Repository,
  ): Promise<QueryStrategy> {
    try {
      const { output } = await generateText({
        model: routerModel,
        instructions: routerPrompt(repository),
        prompt: conversation,
        output: Output.object({ schema: strategySchema }),
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
      });
      return output.strategy;
    } catch (error) {
      logger.warn({ error }, "query routing failed, searching as written");
      return "direct";
    }
  }
}
