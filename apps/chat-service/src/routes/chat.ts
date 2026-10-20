import { ChatController } from "@/controllers/chat.controller";
import { requireUserId } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import {
  chatIdParamsSchema,
  createChatSchema,
  listChatSchema,
  sendMessageSchema,
  updateChatSchema,
} from "@/validators/chat";
import { Router } from "express";

const router: Router = Router();

router.use(requireUserId);

router.post("/", validate({ body: createChatSchema }), ChatController.create);
router.get("/", validate({ query: listChatSchema }), ChatController.getAll);
router.get(
  "/:id",
  validate({ params: chatIdParamsSchema }),
  ChatController.get,
);
router.patch(
  "/:id",
  validate({ params: chatIdParamsSchema, body: updateChatSchema }),
  ChatController.update,
);
router.delete(
  "/:id",
  validate({ params: chatIdParamsSchema }),
  ChatController.delete,
);
router.post(
  "/:id/messages",
  validate({ params: chatIdParamsSchema, body: sendMessageSchema }),
  ChatController.sendMessage,
);

export default router;
