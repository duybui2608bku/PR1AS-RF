jest.mock("../../../repositories/chat/chat.repository", () => ({
  chatRepository: { getConversationWithDetails: jest.fn() },
}));
jest.mock("../../../repositories/auth/user.repository", () => ({
  userRepository: { findById: jest.fn() },
}));
jest.mock("../../../repositories/moderation", () => ({
  moderationRepository: { findBlock: jest.fn().mockResolvedValue(null) },
}));
jest.mock("../../../config/socket.handlers", () => ({
  isUserOnline: jest.fn(),
  isUserOnlineBulk: jest.fn(),
}));
jest.mock("../../../config/socket", () => ({ getSocketIO: jest.fn() }));

import { chatService } from "../chat.service";
import { chatRepository } from "../../../repositories/chat/chat.repository";
import { userRepository } from "../../../repositories/auth/user.repository";
import { isUserOnline } from "../../../config/socket.handlers";
import { UserRole } from "../../../types/auth/user.types";

describe("chatService.getConversation presence", () => {
  const conversation = {
    _id: "conv-1",
    sender_id: "user-1",
    receiver_id: "user-2",
    last_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (chatRepository.getConversationWithDetails as jest.Mock).mockResolvedValue({
      conversation,
      last_message: undefined,
      unread_count: 0,
    });
  });

  const mockUsers = (otherLastActiveAt: Date | null) => {
    (userRepository.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === "user-1") {
        return Promise.resolve({ _id: "user-1", roles: [UserRole.CLIENT] });
      }
      return Promise.resolve({
        _id: "user-2",
        full_name: "Worker Two",
        avatar: null,
        email: "w2@example.com",
        status: "active",
        roles: [UserRole.WORKER],
        last_active_at: otherLastActiveAt,
      });
    });
  };

  it("marks the other user online with their last_active_at when their socket is connected", async () => {
    const lastActiveAt = new Date("2026-07-28T10:00:00.000Z");
    mockUsers(lastActiveAt);
    (isUserOnline as jest.Mock).mockReturnValue(true);

    const result = await chatService.getConversation("user-1", "conv-1");

    expect(result?.other_user?.presence).toEqual({
      is_online: true,
      last_active_at: lastActiveAt,
    });
  });

  it("reports offline with last_active_at when the other user has no active socket", async () => {
    const lastActiveAt = new Date("2026-07-27T09:00:00.000Z");
    mockUsers(lastActiveAt);
    (isUserOnline as jest.Mock).mockReturnValue(false);

    const result = await chatService.getConversation("user-1", "conv-1");

    expect(result?.other_user?.presence).toEqual({
      is_online: false,
      last_active_at: lastActiveAt,
    });
  });
});
