import { Router } from "express";
import { chatController } from "../../controllers/chat/chat.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

router.post(
  "/messages",
  asyncHandler<AuthRequest>(chatController.sendMessage.bind(chatController))
);

router.get(
  "/messages",
  asyncHandler<AuthRequest>(chatController.getMessages.bind(chatController))
);

router.get(
  "/conversations",
  asyncHandler<AuthRequest>(
    chatController.getConversations.bind(chatController)
  )
);

router.get(
  "/conversations/:conversation_id",
  asyncHandler<AuthRequest>(chatController.getConversation.bind(chatController))
);

router.patch(
  "/messages/read",
  asyncHandler<AuthRequest>(chatController.markAsRead.bind(chatController))
);

router.get(
  "/messages/unread",
  asyncHandler<AuthRequest>(chatController.getUnreadCount.bind(chatController))
);

router.delete(
  "/messages/:message_id",
  asyncHandler<AuthRequest>(chatController.deleteMessage.bind(chatController))
);

export default router;
