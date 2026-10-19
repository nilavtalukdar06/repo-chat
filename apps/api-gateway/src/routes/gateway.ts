import { env } from "@/config/env";
import { requireSession } from "@/middlewares/auth.middleware";
import { createServiceProxy } from "@/middlewares/proxy.middleware";
import { Router } from "express";

const router: Router = Router();

const authProxy = createServiceProxy("auth-service", env.AUTH_SERVICE_URL, [
  "/api/auth",
]);
const repositoryProxy = createServiceProxy(
  "repository-service",
  env.REPOSITORY_SERVICE_URL,
  ["/api/repository"],
);

router.use(
  ["/api/auth/logout", "/api/auth/me", "/api/auth/validate"],
  requireSession,
);
router.use("/api/repository", requireSession);

router.use(authProxy);
router.use(repositoryProxy);

export default router;
