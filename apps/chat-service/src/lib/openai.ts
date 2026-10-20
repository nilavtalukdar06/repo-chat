import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { env } from "@/config/env";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export const chatModel: LanguageModel = openai(env.OPENAI_MODEL);
export const titleModel: LanguageModel = openai(env.OPENAI_TITLE_MODEL);
export const routerModel: LanguageModel = openai(env.QUERY_ROUTER_MODEL);
export const rewriteModel: LanguageModel = openai(env.QUERY_REWRITE_MODEL);
export const embeddingModel: EmbeddingModel = openai.embedding(
  "text-embedding-3-small",
);
