import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../core/api-error";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate({ body, query, params }: ValidationSchemas) {
  return (req: Request, _: Response, next: NextFunction) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (query) {
        const parsed = query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (params) {
        req.params = params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      next(
        new ApiError({
          statusCode: StatusCodes.BAD_REQUEST,
          message: "Validation failed",
          errors: error instanceof Error ? [error] : [],
          cause: error,
        }),
      );
    }
  };
}
