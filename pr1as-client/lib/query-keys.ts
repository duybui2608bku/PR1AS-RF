export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    deletionStatus: ["auth", "deletion-status"] as const,
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
    adminContact: ["chat", "admin-contact"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) =>
      ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    analytics: (params?: Record<string, unknown>) =>
      ["dashboard", "analytics", params] as const,
  },
  posts: {
    all: ["posts"] as const,
    feed: (params?: Record<string, unknown>) =>
      ["posts", "feed", params] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    comments: (postId: string, params?: Record<string, unknown>) =>
      ["posts", "comments", postId, params] as const,
    registrations: (postId: string) =>
      ["posts", "registrations", postId] as const,
    registeredFeed: (params?: Record<string, unknown>) =>
      ["posts", "registeredFeed", params] as const,
  },
  hashtags: {
    all: ["hashtags"] as const,
    trending: (params?: Record<string, unknown>) =>
      ["hashtags", "trending", params] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    adminAll: ["transactions", "admin"] as const,
    adminList: (params?: Record<string, unknown>) =>
      ["transactions", "admin", "list", params] as const,
    adminStats: (params?: Record<string, unknown>) =>
      ["transactions", "admin", "stats", params] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    list: (params?: Record<string, unknown>) =>
      ["bookings", "list", params] as const,
    adminAnalytics: (params?: Record<string, unknown>) =>
      ["bookings", "admin", "analytics", params] as const,
    schedule: (params?: Record<string, unknown>) =>
      ["bookings", "schedule", params] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
    clientProfile: (id: string) =>
      ["bookings", "client-profile", id] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    my: (params?: Record<string, unknown>) =>
      ["reviews", "my", params] as const,
    detail: (id: string) => ["reviews", "detail", id] as const,
  },
  workerQuestions: {
    all: ["worker-questions"] as const,
    byWorker: (workerId: string, params?: Record<string, unknown>) =>
      ["worker-questions", "worker", workerId, params] as const,
  },
  workers: {
    all: ["workers"] as const,
    detail: (id: string) => ["workers", "detail", id] as const,
    favorites: ["workers", "favorites"] as const,
    favoriteIds: ["workers", "favorite-ids"] as const,
    suggestions: (id: string, limit: number) =>
      ["workers", "suggestions", id, limit] as const,
    schedule: (id: string, params: Record<string, unknown>) =>
      ["workers", "schedule", id, params] as const,
    myServices: ["workers", "my-services"] as const,
  },
  services: {
    all: ["services"] as const,
    adminList: (params?: Record<string, unknown>) =>
      ["services", "admin", "list", params] as const,
  },
  moderation: {
    all: ["moderation"] as const,
    blocks: ["moderation", "blocks"] as const,
    openPostReport: (postId: string) =>
      ["moderation", "reports", "post", postId, "open"] as const,
    openWorkerReport: (workerId: string) =>
      ["moderation", "reports", "worker", workerId, "open"] as const,
    reports: (params?: Record<string, unknown>) =>
      ["moderation", "reports", params] as const,
    myReports: (params?: Record<string, unknown>) =>
      ["moderation", "reports", "mine", params] as const,
    restrictions: (params?: Record<string, unknown>) =>
      ["moderation", "restrictions", params] as const,
  },
  reputation: {
    history: (params?: Record<string, unknown>) =>
      ["reputation", "history", params] as const,
  },
  feedback: {
    all: ["feedback"] as const,
    mine: (params?: Record<string, unknown>) =>
      ["feedback", "mine", params] as const,
    admin: (params?: Record<string, unknown>) =>
      ["feedback", "admin", params] as const,
  },
  reputationConfig: {
    all: ["reputation-config"] as const,
  },
  siteSettings: {
    all: ["site-settings"] as const,
  },
  about: {
    all: ["about-content"] as const,
  },
  legal: {
    all: ["legal-content"] as const,
    page: (page: string) => ["legal-content", page] as const,
  },
  contact: {
    all: ["contact-content"] as const,
  },
  emailCampaigns: {
    all: ["email-campaigns"] as const,
    list: (params?: Record<string, unknown>) =>
      ["email-campaigns", "list", params] as const,
    detail: (id: string) => ["email-campaigns", "detail", id] as const,
    logs: (id: string, params?: Record<string, unknown>) =>
      ["email-campaigns", "logs", id, params] as const,
  },
  vouchers: {
    all: ["vouchers"] as const,
    adminList: (params?: Record<string, unknown>) =>
      ["vouchers", "admin", "list", params] as const,
  },
  announcements: {
    all: ["announcements"] as const,
    byPlacement: (placement: string) =>
      ["announcements", "placement", placement] as const,
    admin: {
      all: ["announcements", "admin"] as const,
      list: (params?: Record<string, unknown>) =>
        ["announcements", "admin", "list", params] as const,
      detail: (id: string) => ["announcements", "admin", "detail", id] as const,
    },
  },
  boostPoints: ["boost", "points"] as const,
  boostStatus: ["boost", "status"] as const,
  boostConfig: ["boost", "config"] as const,
} as const
