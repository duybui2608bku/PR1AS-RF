jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { updateLastActiveNow: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../repositories/chat/conversation.repository", () => ({
  conversationRepository: { listDirectPartnerIds: jest.fn() },
  // chat.repository.ts (transitively imported by socket.handlers.ts via
  // repositories/chat) also imports the `ConversationRepository` class
  // itself (not just the singleton) to build its own internal instance.
  // Without this stub the module factory leaves that export undefined and
  // `new ConversationRepository()` throws at import time.
  ConversationRepository: jest.fn().mockImplementation(() => ({
    findOrCreateConversation: jest.fn(),
    findConversationById: jest.fn(),
    getUserConversations: jest.fn(),
    updateConversationLastMessage: jest.fn(),
    getConversationWithDetails: jest.fn(),
    getUnreadCount: jest.fn(),
    getConversationUnreadCounts: jest.fn(),
  })),
}));
jest.mock("../socket", () => ({
  getSocketIO: jest.fn(),
}));

import { userRepository } from "../../repositories/auth/user.repository";
import { conversationRepository } from "../../repositories/chat/conversation.repository";
import { getSocketIO } from "../socket";
import { registerUserSocket, unregisterUserSocket } from "../socket.handlers";
import { SOCKET_EVENTS } from "../../constants/socket";

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe("presence transition broadcast", () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));

  beforeEach(() => {
    jest.clearAllMocks();
    (getSocketIO as jest.Mock).mockReturnValue({ to });
    (conversationRepository.listDirectPartnerIds as jest.Mock).mockResolvedValue([
      "partner-1",
      "partner-2",
    ]);
  });

  afterEach(() => {
    unregisterUserSocket("user-1", "socket-1");
    unregisterUserSocket("user-1", "socket-2");
  });

  it("emits presence:update to every direct-chat partner room when the user's first socket connects", async () => {
    registerUserSocket("user-1", "socket-1");
    await flushMicrotasks();

    expect(userRepository.updateLastActiveNow).toHaveBeenCalledWith("user-1");
    expect(to).toHaveBeenCalledWith("user:partner-1");
    expect(to).toHaveBeenCalledWith("user:partner-2");
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      expect.objectContaining({ user_id: "user-1", is_online: true })
    );
  });

  it("does not re-broadcast when a second socket for the same user connects", async () => {
    registerUserSocket("user-1", "socket-1");
    await flushMicrotasks();
    jest.clearAllMocks();

    registerUserSocket("user-1", "socket-2");
    await flushMicrotasks();

    expect(userRepository.updateLastActiveNow).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });

  it("emits is_online: false only when the last socket disconnects", async () => {
    registerUserSocket("user-1", "socket-1");
    registerUserSocket("user-1", "socket-2");
    await flushMicrotasks();
    jest.clearAllMocks();

    unregisterUserSocket("user-1", "socket-1");
    await flushMicrotasks();
    expect(to).not.toHaveBeenCalled();

    unregisterUserSocket("user-1", "socket-2");
    await flushMicrotasks();
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      expect.objectContaining({ user_id: "user-1", is_online: false })
    );
  });
});
