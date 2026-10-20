import { RepoController } from "@/controllers/repo.controller";
import { requireUserId } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import {
  createRepoSchema,
  listRepoSchema,
  repoIdParamsSchema,
  updateRepoStatusSchema,
} from "@/validators/repository";
import { Router } from "express";

const router: Router = Router();

router.use(requireUserId);

router.post("/", validate({ body: createRepoSchema }), RepoController.create);
router.get("/", validate({ query: listRepoSchema }), RepoController.getAll);
router.get(
  "/:id",
  validate({ params: repoIdParamsSchema }),
  RepoController.get,
);
router.get(
  "/:id/logs",
  validate({ params: repoIdParamsSchema }),
  RepoController.getLogs,
);
router.patch(
  "/:id",
  validate({ params: repoIdParamsSchema, body: updateRepoStatusSchema }),
  RepoController.update,
);
router.delete(
  "/:id",
  validate({ params: repoIdParamsSchema }),
  RepoController.delete,
);

export default router;
