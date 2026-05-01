export enum ChatTabKey {
  DIRECT = "direct",
  COMPLAINT = "complaint",
}

export const ChatPagination = {
  PAGE_DEFAULT: 1,
  LIMIT_CONVERSATIONS: 50,
  LIMIT_MESSAGES: 100,
  LIMIT_GROUP_MESSAGES: 100,
} as const;

export enum ChatRefetchInterval {
  CONVERSATIONS_MS = 30000,
}

export enum TypingIndicatorTimeout {
  MS = 3000,
}
