import { Router } from "express";
import gatewayRouter from "./gateway";
import healthRouter from "./health";

const router: Router = Router();

router.use(healthRouter);
router.use(gatewayRouter);

export default router;
