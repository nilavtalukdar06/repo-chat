import { createGateway, type RerankingModel } from "ai";
import { env } from "@/config/env";

const gateway = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
  ...(env.AI_GATEWAY_BASE_URL ? { baseURL: env.AI_GATEWAY_BASE_URL } : {}),
});

export const rerankModel: RerankingModel = gateway.rerankingModel(
  env.RERANK_MODEL,
);
