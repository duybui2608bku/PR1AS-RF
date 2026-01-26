export enum AppRoute {
  HOME = "/",
  AUTH_LOGIN = "/auth/login",
  AUTH_REGISTER = "/auth/register",
  CLIENT_PROFILE = "/client/profile",
  CLIENT_PROFILE_EDIT = "/client/profile/edit",
  CLIENT_WALLET_DEPOSIT = "/client/wallet/deposit",
  CLIENT_WALLET = "/client/wallet",
  WORKER_WALLET = "/worker/wallet",
  CLIENT_BOOKINGS = "/client/bookings",
  WORKER_SETUP = "/worker/setup",
  WORKER_BOOKINGS = "/worker/bookings",
  CHAT = "/chat",
  ADMIN_DASHBOARD = "/admin/dashboard",
}

export enum UserRole {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
}

export const buildWorkerProfileRoute = (userId: string): string => {
  return `/worker/${userId}`;
};

export const buildChatRoute = (userId?: string): string => {
  if (!userId) {
    return AppRoute.CHAT;
  }
  return `${AppRoute.CHAT}?userId=${userId}`;
};
