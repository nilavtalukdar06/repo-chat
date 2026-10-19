import { env } from "@/config/env";
import { requireSession } from "@/middlewares/auth.middleware";
import { createServiceProxy } from "@/middlewares/proxy.middleware";
import { Router } from "express";

const router: Router = Router();

const authProxy = createServiceProxy("auth-service", env.AUTH_SERVICE_URL, [
  "/api/auth",
]);
const indexingProxy = createServiceProxy(
  "indexing-service",
  env.INDEXING_SERVICE_URL,
  ["/api/indexing"],
);

router.use(
  ["/api/auth/logout", "/api/auth/me", "/api/auth/validate"],
  requireSession,
);
router.use("/api/indexing", requireSession);

router.use(authProxy);
router.use(indexingProxy);

export default router;
