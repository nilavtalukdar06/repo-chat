import { logger } from "@/config/logger";
import { titleModel } from "@/lib/openai";
import { generateText } from "ai";

const MAX_TITLE_LENGTH = 60;
const TITLE_TIMEOUT_MS = 10_000;
const TITLE_PROMPT =
  "Write a short title (3 to 6 words) summarising the user's message for a chat history sidebar. Reply with the title only: no quotes, no trailing punctuation.";

function clean(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/^["'`*#\s]+|["'`*.\s]+$/g, "")
    .slice(0, MAX_TITLE_LENGTH)
    .trim();
}

export abstract class TitleService {
  static async generate(message: string): Promise<string> {
    const fallback = clean(message) || "New chat";
    try {
      const { text } = await generateText({
        model: titleModel,
        instructions: TITLE_PROMPT,
        prompt: message,
        maxOutputTokens: 24,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
      });
      return clean(text) || fallback;
    } catch (error) {
      logger.warn({ error }, "chat title generation failed");
      return fallback;
    }
  }
}
