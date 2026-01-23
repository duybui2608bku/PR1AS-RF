import { User } from "../../models/auth/user.model";
import {
  IUserDocument,
  UserRole,
  UserStatus,
} from "../../types/auth/user.types";
import { GetUsersQuery } from "../../types/user/user.dto";

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name?: string;
  phone?: string;
}

export interface FindAllUsersResult {
  users: IUserDocument[];
  total: number;
}

export class UserRepository {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id).lean() as Promise<IUserDocument | null>;
  }

  async getLastActiveRoleById(userId: string): Promise<UserRole | null> {
    const user = await User.findById(userId).select("last_active_role").lean();
    return user?.last_active_role || null;
  }

  async getRolesById(userId: string): Promise<UserRole[]> {
    const user = await User.findById(userId).select("roles").lean();
    return user?.roles || [];
  }

  async getUserRoleInfoById(userId: string): Promise<{
    lastActiveRole: UserRole | null;
    isWorker: boolean;
    isClient: boolean;
    isAdmin: boolean;
  }> {
    const lastActiveRole = await this.getLastActiveRoleById(userId);
    const roles = await this.getRolesById(userId);
    return {
      lastActiveRole,
      isWorker: roles.includes(UserRole.WORKER),
      isClient: roles.includes(UserRole.CLIENT),
      isAdmin: roles.includes(UserRole.ADMIN),
    };
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

  async updateLastActiveRole(
    id: string,
    last_active_role: UserRole
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { last_active_role }, { new: true });
  }

  async updateWorkerProfile(
    id: string,
    worker_profile: Partial<IUserDocument["worker_profile"]>
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { worker_profile }, { new: true });
  }

  async updateBasicProfile(
    id: string,
    updates: {
      avatar?: string | null;
      full_name?: string | null;
      phone?: string | null;
      password_hash?: string;
    }
  ): Promise<IUserDocument | null> {
    const updateData: Record<string, unknown> = {};

    if (updates.avatar !== undefined) {
      updateData.avatar = updates.avatar;
    }
    if (updates.full_name !== undefined) {
      updateData.full_name = updates.full_name?.trim() || null;
    }
    if (updates.phone !== undefined) {
      updateData.phone = updates.phone?.trim() || null;
    }
    if (updates.password_hash !== undefined) {
      updateData.password_hash = updates.password_hash;
    }

    return User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findByIdWithPassword(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("_id");
    return !!user;
  }

  async findAllWithFilters(
    query: GetUsersQuery & { skip: number }
  ): Promise<FindAllUsersResult> {
    const {
      skip,
      limit = 10,
      search,
      role,
      status,
      startDate,
      endDate,
    } = query;

    const filter: Record<string, unknown> = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { full_name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (role) {
      filter.roles = role;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.created_at = {} as { $gte?: Date; $lte?: Date };
      if (startDate) {
        (filter.created_at as { $gte: Date }).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.created_at as { $lte: Date }).$lte = new Date(endDate);
      }
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password_hash -refresh_token_hash")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users: users as IUserDocument[],
      total,
    };
  }
}

export const userRepository = new UserRepository();
