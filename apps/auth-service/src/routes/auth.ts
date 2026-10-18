import { AuthController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validation.middleware";
import { loginSchema, registerSchema } from "@/validators/auth";
import { Router } from "express";

const router: Router = Router();

router.post(
  "/register",
  validate({ body: registerSchema }),
  AuthController.register,
);
router.post(
  "/login",
  validate({ body: loginSchema }),
  AuthController.login,
);
router.post("/logout", AuthController.logout);

export default router;
