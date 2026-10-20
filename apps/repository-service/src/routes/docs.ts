import { openApiSpec } from "@/docs/openapi";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import swaggerUi from "swagger-ui-express";

const router: Router = Router();

router.get("/docs.json", (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

router.use("/docs", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;",
  );
  next();
});
router.use("/docs", swaggerUi.serve);
router.get(
  "/docs",
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: "Repository Service API Docs",
  }),
);

export default router;
