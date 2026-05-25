import { Types } from "mongoose";
import { User } from "../../models/auth/user.model";
import {
  IUserDocument,
  UserRole,
  UserStatus,
} from "../../types/auth/user.types";
import { PricingPlanCode } from "../../constants/pricing";
import { GetUsersQuery } from "../../types/user/user.dto";
import { escapeRegExp } from "../../utils/string";

export interface CreateUserInput {
  email: string;
  password_hash?: string;
  full_name?: string;
  phone?: string;
}

export interface CreateGoogleUserInput {
  email: string;
  google_id: string;
  full_name?: string;
  avatar?: string;
}

export interface FindAllUsersResult {
  users: IUserDocument[];
  total: number;
}

export interface UpdateWorkerProfileOptions {
  coords?: { latitude: number | null; longitude: number | null };
  addWorkerRole?: boolean;
  setLastActiveRole?: UserRole;
}

export class UserRepository {
  async findManyByIds(ids: string[]): Promise<IUserDocument[]> {
    if (ids.length === 0) return [];
    return User.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    })
      .select("-password_hash -refresh_token_hash")
      .lean() as Promise<IUserDocument[]>;
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase().trim() }).select("+password_hash");
  }

  async findByEmailWithGoogleId(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password_hash +google_id"
    );
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id).lean() as Promise<IUserDocument | null>;
  }

  async findRolesById(id: string): Promise<UserRole[] | null> {
    const user = await User.findById(id).select("roles").lean();
    return user ? user.roles : null;
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
    roles: UserRole[];
    isWorker: boolean;
    isClient: boolean;
    isAdmin: boolean;
  }> {
    const user = await User.findById(userId).select("last_active_role roles").lean();
    const lastActiveRole = user?.last_active_role ?? null;
    const roles = user?.roles ?? [];
    return {
      lastActiveRole,
      roles,
      isWorker: lastActiveRole === UserRole.WORKER,
      isClient: lastActiveRole === UserRole.CLIENT,
      isAdmin: roles.includes(UserRole.ADMIN),
    };
  }

  async create(data: CreateUserInput): Promise<IUserDocument> {
    const user = new User({
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash || null,
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

  async findByGoogleId(googleId: string): Promise<IUserDocument | null> {
    return User.findOne({ google_id: googleId }).select("+google_id");
  }

  async createGoogleUser(data: CreateGoogleUserInput): Promise<IUserDocument> {
    const user = new User({
      email: data.email.toLowerCase().trim(),
      google_id: data.google_id,
      full_name: data.full_name || null,
      avatar: data.avatar || null,
      roles: [UserRole.CLIENT],
      status: UserStatus.ACTIVE,
      verify_email: true,
      created_at: new Date(),
      last_login: null,
    });
    return user.save();
  }

  async linkGoogleId(id: string, googleId: string): Promise<void> {
    await User.findByIdAndUpdate(id, { google_id: googleId });
  }

  async updateRoles(id: string, roles: UserRole[]): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { roles }, { new: true });
  }

  async updateStatus(id: string, status: UserStatus): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { status }, { new: true });
  }

  async updateLastActiveRole(id: string, last_active_role: UserRole): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { last_active_role }, { new: true });
  }

  async updateWorkerProfile(
    id: string,
    profileFields: Record<string, unknown>,
    options?: UpdateWorkerProfileOptions
  ): Promise<IUserDocument | null> {
    const $set: Record<string, unknown> = {};

    // Dot-notation: update only provided fields, never wipe existing subdoc data
    for (const [key, val] of Object.entries(profileFields)) {
      if (val !== undefined) {
        $set[`worker_profile.${key}`] = val;
      }
    }

    if (options?.coords) {
      $set["coords.latitude"] = options.coords.latitude;
      $set["coords.longitude"] = options.coords.longitude;
    }

    if (options?.setLastActiveRole) {
      $set.last_active_role = options.setLastActiveRole;
    }

    const update: Record<string, unknown> = { $set };

    if (options?.addWorkerRole) {
      update.$addToSet = { roles: UserRole.WORKER };
    }

    return User.findByIdAndUpdate(id, update, { new: true });
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

    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.full_name !== undefined) updateData.full_name = updates.full_name?.trim() || null;
    if (updates.phone !== undefined) updateData.phone = updates.phone?.trim() || null;
    if (updates.password_hash !== undefined) updateData.password_hash = updates.password_hash;

    return User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findByIdWithPassword(id: string): Promise<IUserDocument | null> {
    return User.findById(id).select("+password_hash");
  }

  async updatePricingInfo(
    id: string,
    pricing: {
      pricing_plan_code: PricingPlanCode;
      pricing_started_at: Date | null;
      pricing_expires_at: Date | null;
    },
    session?: import("mongoose").ClientSession
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      id,
      {
        "meta_data.pricing_plan_code": pricing.pricing_plan_code,
        "meta_data.pricing_started_at": pricing.pricing_started_at,
        "meta_data.pricing_expires_at": pricing.pricing_expires_at,
      },
      { new: true, session }
    );
  }

  async emailExists(email: string): Promise<boolean> {
    return User.exists({ email: email.toLowerCase().trim() }).then(Boolean);
  }

  async findAllWithFilters(
    query: GetUsersQuery & { skip: number }
  ): Promise<FindAllUsersResult> {
    const { skip, limit = 10, search, role, status, startDate, endDate } = query;

    const filter: Record<string, unknown> = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), "i");
      filter.$or = [
        { full_name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (role) filter.roles = role;
    if (status) filter.status = status;

    if (startDate || endDate) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.created_at = dateFilter;
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

    return { users: users as IUserDocument[], total };
  }

  async adjustReputationScore(
    id: string,
    delta: number
  ): Promise<{ newScore: number; previousScore: number } | null> {
    const doc = await User.findById(id).select("meta_data.reputation_score").lean();
    if (!doc) return null;
    const previousScore =
      (doc as unknown as { meta_data?: { reputation_score?: number } })
        ?.meta_data?.reputation_score ?? 100;
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    await User.findByIdAndUpdate(id, { "meta_data.reputation_score": newScore });
    return { newScore, previousScore };
  }

  async incrementReputationScoreForAll(delta: number): Promise<number> {
    const result = await User.updateMany(
      { "meta_data.reputation_score": { $lt: 100 } },
      [{
        $set: {
          "meta_data.reputation_score": {
            $min: [100, { $add: ["$meta_data.reputation_score", delta] }],
          },
        },
      }]
    );
    return result.modifiedCount;
  }

  async findReputationRecoveryCandidates(): Promise<
    Array<{ _id: Types.ObjectId; meta_data?: { reputation_score?: number } }>
  > {
    return User.find({ "meta_data.reputation_score": { $lt: 100 } })
      .select("_id meta_data.reputation_score")
      .lean() as Promise<
      Array<{ _id: Types.ObjectId; meta_data?: { reputation_score?: number } }>
    >;
  }

  async findFirstAdmin(): Promise<IUserDocument | null> {
    return User.findOne({ roles: UserRole.ADMIN, status: UserStatus.ACTIVE })
      .select("_id full_name email avatar roles")
      .lean() as Promise<IUserDocument | null>;
  }

  async findByIdWithRefreshToken(id: string): Promise<IUserDocument | null> {
    return User.findById(id).select("+refresh_token_hash");
  }

  async setRefreshTokenHash(id: string, refresh_token_hash: string | null): Promise<void> {
    await User.findByIdAndUpdate(id, {
      refresh_token_hash,
      ...(refresh_token_hash !== null && { last_login: new Date() }),
    });
  }

  async clearRefreshToken(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { refresh_token_hash: null });
  }

  async setPasswordResetToken(id: string, tokenHash: string, expires: Date): Promise<void> {
    await User.findByIdAndUpdate(id, {
      password_reset_token: tokenHash,
      password_reset_expires: expires,
    });
  }

  async findByPasswordResetToken(tokenHash: string): Promise<IUserDocument | null> {
    return User.findOne({ password_reset_token: tokenHash }).select(
      "+password_reset_token +password_reset_expires"
    );
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      password_reset_token: null,
      password_reset_expires: null,
    });
  }

  async resetPassword(id: string, password_hash: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      password_hash,
      password_reset_token: null,
      password_reset_expires: null,
      refresh_token_hash: null,
    });
  }

  async setEmailVerificationToken(id: string, tokenHash: string, expires: Date): Promise<void> {
    await User.findByIdAndUpdate(id, {
      email_verification_token: tokenHash,
      email_verification_expires: expires,
    });
  }

  async findByEmailVerificationToken(tokenHash: string): Promise<IUserDocument | null> {
    return User.findOne({ email_verification_token: tokenHash }).select(
      "+email_verification_token +email_verification_expires"
    );
  }

  async clearEmailVerificationToken(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      email_verification_token: null,
      email_verification_expires: null,
    });
  }

  async markEmailVerified(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      verify_email: true,
      email_verification_token: null,
      email_verification_expires: null,
    });
  }
}

export const userRepository = new UserRepository();
