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

  async updateLastActiveRole(
    id: string,
    last_active_role: UserRole
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      id,
      { last_active_role },
      { new: true }
    );
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("_id");
    return !!user;
  }

  /**
   * Tìm tất cả users với filters và pagination
   */
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

    // Filter by search (full_name, email, phone)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { full_name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Filter by Role
    if (role) {
      filter.roles = role;
    }

    // Filter by Status
    if (status) {
      filter.status = status;
    }

    // Filter by Date Range
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.created_at.$lte = new Date(endDate);
      }
    }

    // Execute Query
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
