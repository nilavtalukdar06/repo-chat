import compression from "compression";
import express, { type Application } from "express";
import helmet from "helmet";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { httpLogger } from "./config/http-logger";
import { corsConfig } from "./config/cors";
import { rateLimiter } from "./config/rate-limit";
import { env } from "./config/env";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import cookieParser from "cookie-parser";

const app: Application = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

app.use(requestIdMiddleware);
app.use(httpLogger);

app.use(corsConfig);
app.use(rateLimiter);

app.use(cookieParser());

app.use(
  express.json({
    limit: env.BODY_LIMIT,
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: env.BODY_LIMIT,
  }),
);

app.use(router);
app.use(errorMiddleware);

export default app;
