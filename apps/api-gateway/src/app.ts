import express, { type Application } from "express";
import { corsConfig } from "./config/cors";
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
app.use(rateLimiter);

app.use(router);
app.use(errorMiddleware);

export default app;
