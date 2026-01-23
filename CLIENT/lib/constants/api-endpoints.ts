export enum ApiEndpoint {
  AUTH_CSRF_TOKEN = "/auth/csrf-token",
  AUTH_REGISTER = "/auth/register",
  AUTH_LOGIN = "/auth/login",
  AUTH_REFRESH_TOKEN = "/auth/refresh-token",
  AUTH_ME = "/auth/me",
  AUTH_LOGOUT = "/auth/logout",
  AUTH_SWITCH_ROLE = "/auth/switch-role",
  AUTH_PROFILE = "/auth/me",
  AUTH_UPDATE_PROFILE = "/auth/update-profile",
  AUTH_FORGOT_PASSWORD = "/auth/forgot-password",
  AUTH_RESET_PASSWORD = "/auth/reset-password",
  AUTH_VERIFY_EMAIL = "/auth/verify-email",
  AUTH_RESEND_VERIFICATION = "/auth/resend-verification",
  USERS = "/users",
  USERS_STATUS = "/users/:id/status",
  SERVICES = "/services",
  SERVICES_BY_ID = "/services/:id",
  SERVICES_BY_CODE = "/services/code/:code",
  WORKERS_BY_ID = "/workers/:id",
  WORKERS_GROUPED_BY_SERVICE = "/workers/grouped-by-service",
  WORKER_SERVICES = "/worker/services",
  WORKER_SERVICES_BY_ID = "/worker/services/:serviceId",
  CHAT_MESSAGES = "/chat/messages",
  CHAT_MESSAGES_BY_ID = "/chat/messages/:message_id",
  CHAT_MESSAGES_READ = "/chat/messages/read",
  CHAT_MESSAGES_UNREAD = "/chat/messages/unread",
  CHAT_CONVERSATIONS = "/chat/conversations",
  CHAT_CONVERSATIONS_BY_ID = "/chat/conversations/:conversation_id",
  WALLET_DEPOSIT = "/wallet/deposit",
  WALLET_DEPOSIT_CALLBACK = "/wallet/deposit/callback",
  WALLET_BALANCE = "/wallet/balance",
  WALLET_TRANSACTIONS = "/wallet/transactions",
  ADMIN_WALLET_TRANSACTIONS = "/admin/wallet/transactions",
  ADMIN_WALLET_STATS = "/admin/wallet/stats",
  ADMIN_WALLET_TOP_USERS = "/admin/wallet/top-users",
  ADMIN_WALLET_CHART = "/admin/wallet/chart",
  BOOKINGS = "/bookings",
  BOOKINGS_MY = "/bookings/my",
  BOOKINGS_ALL = "/bookings/all",
  BOOKINGS_BY_ID = "/bookings/:id",
  BOOKINGS_BY_ID_STATUS = "/bookings/:id/status",
  BOOKINGS_BY_ID_CANCEL = "/bookings/:id/cancel",
  REVIEWS = "/reviews",
  REVIEWS_MY = "/reviews/my",
  REVIEWS_BY_ID = "/reviews/:id",
  ESCROWS_MY = "/escrows/my",
  ESCROWS_ALL = "/escrows/all",
  ESCROWS_BY_ID = "/escrows/:id",
}

export const buildEndpoint = (
  endpoint: ApiEndpoint,
  params?: Record<string, string>
): string => {
  let path = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
  }
  return path;
};
