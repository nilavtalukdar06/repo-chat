import pinoHttp from "pino-http";
import { logger } from "./logger";

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  customSuccessMessage: function (req, reply) {
    return `${req.method} ${req.url} ${reply.statusCode}`;
  },
  customErrorMessage: function (req, reply) {
    return `${req.method} ${req.url} ${reply.statusCode}`;
  },
});
