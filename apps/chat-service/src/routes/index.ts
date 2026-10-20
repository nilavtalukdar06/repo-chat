import { Router } from "express";
import docsRouter from "./docs";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use(docsRouter);

export default router;
