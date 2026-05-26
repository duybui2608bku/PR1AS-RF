import { userRepository } from "../repositories/auth/user.repository";
import { UserStatus } from "../types/auth/user.types";
import { TTLCache } from "./ttlCache";

// 30s TTL bounds how long a JWT signed before a ban can keep granting access.
// Short enough that a banned user is locked out within half a minute, long
// enough that the hot path (chat send, message receive) doesn't hit Mongo on
// every request.
const STATUS_CACHE_TTL_MS = 30_000;
const STATUS_CACHE_MAX = 10_000;

const statusCache = new TTLCache<string, UserStatus>(
  STATUS_CACHE_MAX,
  STATUS_CACHE_TTL_MS
);

export const getFreshUserStatus = async (
  userId: string
): Promise<UserStatus | null> => {
  const cached = statusCache.get(userId);
  if (cached !== undefined) return cached;
  const status = await userRepository.findStatusById(userId);
  if (status) statusCache.set(userId, status);
  return status;
};

export const invalidateUserStatusCache = (userId: string): void => {
  statusCache.delete(userId);
};
