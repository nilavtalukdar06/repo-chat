import { Router } from "express";
import authRouter from "./auth";
import docsRouter from "./docs";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use("/api/auth", authRouter);

export default router;
