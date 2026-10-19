import { Router } from "express";
import docsRouter from "./docs";
import gatewayRouter from "./gateway";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use(gatewayRouter);

export default router;
