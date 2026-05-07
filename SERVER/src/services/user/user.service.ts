import { userRepository } from "../../repositories/auth/user.repository";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus, UserRole } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES, AUTH_MESSAGES } from "../../constants/messages";
import { IUserDocument } from "../../types/auth/user.types";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { UpdateBasicProfileSchemaType, UpdateWorkerProfileSchemaType } from "../../validations/user/user.validation";

export class UserService {
  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const user = await userRepository.updateStatus(userId, status);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
  }

  async updateLastActiveRole(userId: string, last_active_role: UserRole): Promise<IUserDocument> {
    // Only fetch roles — no need for the full document
    const roles = await userRepository.findRolesById(userId);
    if (!roles) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    if (!roles.includes(last_active_role)) {
      throw AppError.badRequest(
        `User does not have ${last_active_role} role. Please add this role first.`
      );
    }

    const user = await userRepository.updateLastActiveRole(userId, last_active_role);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    return user;
  }

  async getAllUsers(
    query: GetUsersQuery & { skip: number }
  ): Promise<{ users: IUserDocument[]; total: number }> {
    return userRepository.findAllWithFilters(query);
  }

  async updateWorkerProfile(
    userId: string,
    input: UpdateWorkerProfileSchemaType["worker_profile"]
  ): Promise<IUserDocument> {
    const currentUser = await userRepository.findById(userId);  // DB call 1
    if (!currentUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Extract coords — stored at root level, not inside worker_profile subdocument
    const { coords, ...profileFields } = input;

    const user = await userRepository.updateWorkerProfile(  // DB call 2 (compound atomic)
      userId,
      profileFields as Record<string, unknown>,
      {
        coords: coords ?? undefined,
        addWorkerRole: !currentUser.roles.includes(UserRole.WORKER),
        // Only update last_active_role if it's not already WORKER
        setLastActiveRole:
          currentUser.last_active_role !== UserRole.WORKER ? UserRole.WORKER : undefined,
      }
    );

    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    return user;
  }

  async updateBasicProfile(
    userId: string,
    data: UpdateBasicProfileSchemaType
  ): Promise<IUserDocument> {
    let password_hash: string | undefined;

    if (data.password) {
      // Single DB call: get user with password_hash for verification
      const userWithPassword = await userRepository.findByIdWithPassword(userId);
      if (!userWithPassword || !userWithPassword.password_hash) {
        throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
      }

      const isOldPasswordValid = await comparePassword(
        data.old_password!,
        userWithPassword.password_hash
      );

      if (!isOldPasswordValid) {
        throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_INCORRECT);
      }

      password_hash = await hashPassword(data.password);
    }

    const updatedUser = await userRepository.updateBasicProfile(userId, {
      password_hash,
      avatar: data.avatar,
      full_name: data.full_name,
      phone: data.phone,
    });

    if (!updatedUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    return updatedUser;
  }
}

export const userService = new UserService();
