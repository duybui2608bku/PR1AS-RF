import { userRepository } from "../../repositories/auth/user.repository";
import { GetUsersQuery, UserListResponse } from "../../types/user/user.dto";
import { UserStatus } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES } from "../../constants/messages";

/**
 * Cập nhật trạng thái người dùng
 */
export const updateUserStatus = async (
  userId: string,
  status: UserStatus
): Promise<void> => {
  const user = await userRepository.updateStatus(userId, status);
  if (!user) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }
};

/**
 * Lấy danh sách tất cả người dùng với filters và pagination
 */
export const getAllUsers = async (
  query: GetUsersQuery
): Promise<UserListResponse> => {
  const { page = 1, limit = 10 } = query;

  const { users, total } = await userRepository.findAllWithFilters(query);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};
