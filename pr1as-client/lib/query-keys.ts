export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  chat: {
    all: ["chat"] as const,
    directConversationsRoot: ["chat", "direct", "conversations"] as const,
    directConversations: (params?: Record<string, unknown>) =>
      ["chat", "direct", "conversations", params] as const,
    directConversation: (id: string) =>
      ["chat", "direct", "conversation", id] as const,
    directMessagesRoot: ["chat", "direct", "messages"] as const,
    directMessages: (
      conversationId: string,
      params?: Record<string, unknown>
    ) => ["chat", "direct", "messages", conversationId, params] as const,
    groupConversationsRoot: ["chat", "group", "conversations"] as const,
    groupConversations: (params?: Record<string, unknown>) =>
      ["chat", "group", "conversations", params] as const,
    groupConversation: (id: string) =>
      ["chat", "group", "conversation", id] as const,
    groupMessagesRoot: ["chat", "group", "messages"] as const,
    groupMessages: (
      conversationGroupId: string,
      params?: Record<string, unknown>
    ) => ["chat", "group", "messages", conversationGroupId, params] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) =>
      ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
} as const
