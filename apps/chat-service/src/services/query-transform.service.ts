import { logger } from "@/config/logger";
import { hydePrompt, rewritePrompt } from "@/constants/prompts";
import { rewriteModel } from "@/lib/openai";
import type { Repository } from "@/services/repository.service";
import { generateText } from "ai";

const TRANSFORM_TIMEOUT_MS = 10_000;

async function transform(
  instructions: string,
  conversation: string,
  maxOutputTokens: number,
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: rewriteModel,
      instructions,
      prompt: conversation,
      maxOutputTokens,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(TRANSFORM_TIMEOUT_MS),
    });
    return text.trim() || null;
  } catch (error) {
    logger.warn({ error }, "query transform failed, using the original query");
    return null;
  }
}

export abstract class QueryTransformService {
  static async rewrite(
    conversation: string,
    repository: Repository,
  ): Promise<string | null> {
    return await transform(rewritePrompt(repository), conversation, 100);
  }

  static async hyde(
    conversation: string,
    repository: Repository,
  ): Promise<string | null> {
    return await transform(hydePrompt(repository), conversation, 500);
  }
}
