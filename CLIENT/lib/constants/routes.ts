export enum AppRoute {
  HOME = "/",
  AUTH_LOGIN = "/auth/login",
  AUTH_REGISTER = "/auth/register",
  CLIENT_PROFILE = "/client/profile",
  CLIENT_PROFILE_EDIT = "/client/profile/edit",
  CLIENT_WALLET_DEPOSIT = "/client/wallet/deposit",
  WORKER_SETUP = "/worker/setup",
  CHAT = "/chat",
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
