import { Router } from "express";
import authRouter from "./auth";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use("/api/auth", authRouter);

export default router;
