import { userRepository } from "../../repositories/auth/user.repository";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus, UserRole } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES, AUTH_MESSAGES } from "../../constants/messages";
import { IUserDocument } from "../../types/auth/user.types";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { UpdateBasicProfileSchemaType } from "../../validations/user/user.validation";

export const updateUserStatus = async (
  userId: string,
  status: UserStatus
): Promise<void> => {
  const user = await userRepository.updateStatus(userId, status);
  if (!user) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }
};

export const updateLastActiveRole = async (
  userId: string,
  last_active_role: UserRole
): Promise<IUserDocument> => {
  if (
    last_active_role !== UserRole.CLIENT &&
    last_active_role !== UserRole.WORKER
  ) {
    throw AppError.badRequest(USER_MESSAGES.INVALID_ROLE);
  }

  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

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

export const getAllUsers = async (
  query: GetUsersQuery & { skip: number }
): Promise<{ users: IUserDocument[]; total: number }> => {
  const { users, total } = await userRepository.findAllWithFilters(query);

  return {
    users,
    total,
  };
};

export const updateWorkerProfile = async (
  userId: string,
  worker_profile: Partial<IUserDocument["worker_profile"]>
): Promise<IUserDocument> => {
  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  const rolesToUpdate = [...currentUser.roles];
  if (!rolesToUpdate.includes(UserRole.WORKER)) {
    rolesToUpdate.push(UserRole.WORKER);
    await userRepository.updateRoles(userId, rolesToUpdate);
  }

  const lastActiveRole =
    currentUser.last_active_role === UserRole.WORKER
      ? currentUser.last_active_role
      : UserRole.WORKER;
  await userRepository.updateLastActiveRole(userId, lastActiveRole);

  const user = await userRepository.updateWorkerProfile(userId, worker_profile);
  if (!user) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  const updatedUser = await userRepository.findById(userId);
  if (!updatedUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  return updatedUser;
};

export const updateBasicProfile = async (
  userId: string,
  data: UpdateBasicProfileSchemaType
): Promise<IUserDocument> => {
  const currentUser = await userRepository.findById(userId);
  if (!currentUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  if (data.password) {
    if (!data.old_password) {
      throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_INCORRECT, [
        { field: "old_password", message: "Old password is required" },
      ]);
    }

    const userWithPassword = await userRepository.findByIdWithPassword(userId);
    if (!userWithPassword || !userWithPassword.password_hash) {
      throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    }

    const isOldPasswordValid = await comparePassword(
      data.old_password,
      userWithPassword.password_hash
    );

    if (!isOldPasswordValid) {
      throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_INCORRECT);
    }

    const newPasswordHash = await hashPassword(data.password);

    const updatedUser = await userRepository.updateBasicProfile(userId, {
      password_hash: newPasswordHash,
      avatar: data.avatar,
      full_name: data.full_name,
      phone: data.phone,
    });

    if (!updatedUser) {
      throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    }

    return updatedUser;
  }

  const updatedUser = await userRepository.updateBasicProfile(userId, {
    avatar: data.avatar,
    full_name: data.full_name,
    phone: data.phone,
  });

  if (!updatedUser) {
    throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  return updatedUser;
};
