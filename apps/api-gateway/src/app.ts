import path from "node:path";
import express, { type Application, type Request, type Response } from "express";
import { corsConfig } from "./config/cors";
import { env } from "./config/env";
import { rateLimiter } from "./config/rate-limit";
import { securityMiddleware } from "./config/security";
import { errorMiddleware } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { httpLogger } from "./config/http-logger";
import router from "./routes";

const app: Application = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(securityMiddleware);

app.use(requestIdMiddleware);
app.use(httpLogger);

app.use(corsConfig);

if (env.FRONTEND_DIR) {
  app.use(express.static(env.FRONTEND_DIR));
}

app.use(rateLimiter);

app.use(router);

if (env.FRONTEND_DIR) {
  const indexHtml = path.join(env.FRONTEND_DIR, "index.html");
  app.get(/.*/, (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });
}

app.use(errorMiddleware);

export default app;
