import { env } from "@/config/env";
import { ECSClient } from "@aws-sdk/client-ecs";

export const ecsClient = new ECSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
