import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate({ body, query, params }: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
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
      next(error);
    }
  };
}
