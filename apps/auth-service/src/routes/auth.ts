import { rateLimiter } from "@/config/rate-limit";
import { AuthController } from "@/controllers/auth.controller";
import { requireAuth } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { loginSchema, registerSchema } from "@/validators/auth";
import { Router } from "express";

const router: Router = Router();

router.use(rateLimiter);

router.post(
  "/register",
  validate({ body: registerSchema }),
  AuthController.register,
);
router.post("/login", validate({ body: loginSchema }), AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.getMe);
router.get("/validate", requireAuth, AuthController.validateSession);

export default router;
