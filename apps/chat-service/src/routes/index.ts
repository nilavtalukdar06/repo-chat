import { Router } from "express";
import chatRouter from "./chat";
import docsRouter from "./docs";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use("/api/chat", chatRouter);

export default router;
