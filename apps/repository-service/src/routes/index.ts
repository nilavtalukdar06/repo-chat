import { Router } from "express";
import docsRouter from "./docs";
import healthRouter from "./health";
import repositoryRouter from "./repository";

const router: Router = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use("/api/repository", repositoryRouter);

export default router;
