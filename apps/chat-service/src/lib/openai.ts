import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env } from "@/config/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export const chatModel: LanguageModel = openai(env.OPENAI_MODEL);
export const titleModel: LanguageModel = openai(env.OPENAI_TITLE_MODEL);
