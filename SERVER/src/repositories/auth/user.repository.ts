import { User } from "../../models/auth/user.model";
import {
  IUserDocument,
  UserRole,
  UserStatus,
} from "../../types/auth/user.types";

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name?: string;
  phone?: string;
}

export class UserRepository {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  }

  async create(data: CreateUserInput): Promise<IUserDocument> {
    const user = new User({
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash,
      full_name: data.full_name || null,
      phone: data.phone || null,
      roles: [UserRole.CLIENT],
      status: UserStatus.ACTIVE,
      verify_email: false,
      created_at: new Date(),
      last_login: null,
    });

    return user.save();
  }

  async updateLastLogin(id: string): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      id,
      { last_login: new Date() },
      { new: true }
    );
  }

  async updateRoles(
    id: string,
    roles: UserRole[]
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { roles }, { new: true });
  }

  async updateStatus(
    id: string,
    status: UserStatus
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { status }, { new: true });
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("_id");
    return !!user;
  }
}

export const userRepository = new UserRepository();
