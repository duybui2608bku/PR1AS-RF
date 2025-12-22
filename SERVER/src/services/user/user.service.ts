import { userRepository } from "../../repositories/auth/user.repository";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus, UserRole } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES } from "../../constants/messages";
import { IUserDocument } from "../../types/auth/user.types";

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
 * Cập nhật last_active_role của người dùng
 * Chỉ cho phép chuyển đổi giữa CLIENT và WORKER
 * User phải có role đó trong roles array
 */
export const updateLastActiveRole = async (
  userId: string,
  last_active_role: UserRole
): Promise<IUserDocument> => {
  // Chỉ cho phép CLIENT hoặc WORKER
  if (
    last_active_role !== UserRole.CLIENT &&
    last_active_role !== UserRole.WORKER
  ) {
    throw AppError.badRequest(USER_MESSAGES.INVALID_ROLE);
  }

  // Lấy user hiện tại để kiểm tra roles
  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  // Kiểm tra user có role này trong roles array không
  if (!currentUser.roles.includes(last_active_role)) {
    throw AppError.badRequest(
      `User does not have ${last_active_role} role. Please add this role first.`
    );
  }

  const user = await userRepository.updateLastActiveRole(
    userId,
    last_active_role
  );
  if (!user) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }
  return user;
};

/**
 * Lấy danh sách tất cả người dùng với filters và pagination
 * Trả về data và total để controller format với PaginationHelper
 */
export const getAllUsers = async (
  query: GetUsersQuery & { skip: number }
): Promise<{ users: IUserDocument[]; total: number }> => {
  const { users, total } = await userRepository.findAllWithFilters(query);

  return {
    users,
    total,
  };
};
