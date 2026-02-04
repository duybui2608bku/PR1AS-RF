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

router.post(
  "/group/messages",
  asyncHandler<AuthRequest>(
    chatController.sendGroupMessage.bind(chatController)
  )
);

router.get(
  "/group/messages",
  asyncHandler<AuthRequest>(
    chatController.getGroupMessages.bind(chatController)
  )
);

router.get(
  "/group/conversations",
  asyncHandler<AuthRequest>(
    chatController.getGroupConversations.bind(chatController)
  )
);

router.get(
  "/group/conversations/:conversation_group_id",
  asyncHandler<AuthRequest>(
    chatController.getGroupConversation.bind(chatController)
  )
);

router.patch(
  "/group/messages/read",
  asyncHandler<AuthRequest>(
    chatController.markGroupMessagesRead.bind(chatController)
  )
);

router.get(
  "/group/messages/unread",
  asyncHandler<AuthRequest>(
    chatController.getGroupUnreadCount.bind(chatController)
  )
);

router.post(
  "/group/complaint",
  asyncHandler<AuthRequest>(
    chatController.createComplaintConversation.bind(chatController)
  )
);

export default router;
