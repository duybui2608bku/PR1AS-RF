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

const DELETED_USER_FULL_NAME = "Người dùng đã rời";

const WORKER_PROFILE_ALLOWED_FIELDS = new Set([
  "date_of_birth",
  "gender",
  "height_cm",
  "weight_kg",
  "star_sign",
  "lifestyle",
  "hobbies",
  "quote",
  "introduction",
  "gallery_urls",
  "experience",
  "title",
  "work_locations",
]);

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
    return User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password_hash +failed_login_attempts +locked_until"
    );
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

  async findStatusById(id: string): Promise<UserStatus | null> {
    const user = await User.findById(id).select("status").lean();
    return user ? user.status : null;
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
    status: UserStatus | null;
    isWorker: boolean;
    isClient: boolean;
    isAdmin: boolean;
  }> {
    const user = await User.findById(userId)
      .select("last_active_role roles status")
      .lean();
    const lastActiveRole = user?.last_active_role ?? null;
    const roles = user?.roles ?? [];
    return {
      lastActiveRole,
      roles,
      status: user?.status ?? null,
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

  async markPendingDelete(id: string): Promise<IUserDocument | null> {
    return User.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: UserStatus.ACTIVE },
      {
        status: UserStatus.PENDING_DELETE,
        deleted_at: new Date(),
        refresh_token_hash: null,
      },
      { new: true }
    );
  }

  async restoreFromPendingDelete(id: string): Promise<IUserDocument | null> {
    return User.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: UserStatus.PENDING_DELETE },
      {
        status: UserStatus.ACTIVE,
        deleted_at: null,
      },
      { new: true }
    );
  }

  /**
   * Permanently anonymizes a user that has waited out the grace window. PII is
   * replaced with deterministic sentinel values so historical joins (booking,
   * review, wallet) keep working without leaking the original identity.
   */
  async scrubAndMarkDeleted(id: string): Promise<IUserDocument | null> {
    const objectId = new Types.ObjectId(id);
    return User.findOneAndUpdate(
      { _id: objectId, status: UserStatus.PENDING_DELETE },
      {
        status: UserStatus.DELETED,
        email: `deleted_${id}@pr1as.invalid`,
        password_hash: null,
        google_id: null,
        full_name: DELETED_USER_FULL_NAME,
        phone: null,
        avatar: null,
        worker_profile: null,
        client_profile: null,
        refresh_token_hash: null,
        password_reset_token: null,
        password_reset_expires: null,
        email_verification_token: null,
        email_verification_expires: null,
      },
      { new: true }
    );
  }

  async findPendingDeleteExpired(cutoff: Date): Promise<IUserDocument[]> {
    return User.find({
      status: UserStatus.PENDING_DELETE,
      deleted_at: { $lte: cutoff },
    }).lean() as Promise<IUserDocument[]>;
  }

  async updateLastActiveRole(
    id: string,
    last_active_role: UserRole
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { last_active_role }, { new: true });
  }

  async updateWorkerProfile(
    id: string,
    profileFields: Record<string, unknown>,
    options?: UpdateWorkerProfileOptions
  ): Promise<IUserDocument | null> {
    const profileSet: Record<string, unknown> = {};

    // Whitelist guards against arbitrary-key injection from internal callers.
    for (const [key, val] of Object.entries(profileFields)) {
      if (val !== undefined && WORKER_PROFILE_ALLOWED_FIELDS.has(key)) {
        profileSet[key] = val;
      }
    }

    // Aggregation-pipeline update so the subdocument can be initialized when it
    // is null. A plain dot-notation $set ("worker_profile.<field>") throws
    // `Cannot create field '<field>' in element {worker_profile: null}` for any
    // user who has never set up a profile (e.g. first-time become-worker — every
    // fresh account starts with worker_profile: null). $mergeObjects + $ifNull
    // merges only the provided fields and never wipes existing subdoc data.
    // $literal keeps user-supplied values (which may start with "$") as data
    // instead of being evaluated as aggregation field paths.
    const setStage: Record<string, unknown> = {};

    if (Object.keys(profileSet).length > 0) {
      setStage.worker_profile = {
        $mergeObjects: [
          { $ifNull: ["$worker_profile", {}] },
          { $literal: profileSet },
        ],
      };
    }

    if (options?.coords) {
      setStage.coords = { $literal: options.coords };
    }

    if (options?.setLastActiveRole) {
      setStage.last_active_role = options.setLastActiveRole;
    }

    if (options?.addWorkerRole) {
      setStage.roles = {
        $setUnion: [{ $ifNull: ["$roles", []] }, [UserRole.WORKER]],
      };
    }

    if (Object.keys(setStage).length === 0) {
      return User.findById(id);
    }

    // Mongoose 9 requires opting into aggregation-pipeline updates explicitly.
    return User.findByIdAndUpdate(id, [{ $set: setStage }], {
      new: true,
      updatePipeline: true,
    });
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
    if (updates.full_name !== undefined)
      updateData.full_name = updates.full_name?.trim() || null;
    if (updates.phone !== undefined)
      updateData.phone = updates.phone?.trim() || null;
    if (updates.password_hash !== undefined)
      updateData.password_hash = updates.password_hash;

    return User.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findByIdWithPassword(id: string): Promise<IUserDocument | null> {
    return User.findById(id).select("+password_hash");
  }

  async getAuthMethodsById(
    id: string
  ): Promise<{ has_password: boolean; has_google: boolean } | null> {
    const user = await User.findById(id)
      .select("+password_hash +google_id")
      .lean();
    if (!user) return null;
    return {
      has_password: Boolean(user.password_hash),
      has_google: Boolean(user.google_id),
    };
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

  async setOnboardingDone(id: string): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      id,
      { "meta_data.onboarding_done": true },
      { new: true }
    );
  }

  async emailExists(email: string): Promise<boolean> {
    return User.exists({ email: email.toLowerCase().trim() }).then(Boolean);
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
    // Atomic read-modify-write: new:false returns the document as it was
    // *before* the update, letting us reconstruct both scores without a
    // second round-trip and without a read→write race condition.
    const before = await User.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            "meta_data.reputation_score": {
              $max: [
                0,
                {
                  $min: [
                    100,
                    {
                      $add: [
                        { $ifNull: ["$meta_data.reputation_score", 100] },
                        delta,
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: false, projection: { "meta_data.reputation_score": 1 } }
    ).lean();
    if (!before) return null;
    const previousScore =
      (before as unknown as { meta_data?: { reputation_score?: number } })
        ?.meta_data?.reputation_score ?? 100;
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    return { newScore, previousScore };
  }

  async incrementReputationScoreForAll(delta: number): Promise<number> {
    const result = await User.updateMany(
      { "meta_data.reputation_score": { $lt: 100 } },
      [
        {
          $set: {
            "meta_data.reputation_score": {
              $min: [100, { $add: ["$meta_data.reputation_score", delta] }],
            },
          },
        },
      ]
    );
    return result.modifiedCount;
  }

  async findReputationRecoveryCandidates(): Promise<
    Array<{ _id: Types.ObjectId; meta_data?: { reputation_score?: number } }>
  > {
    return User.find({ "meta_data.reputation_score": { $lt: 100 } })
      .select("_id meta_data.reputation_score")
      .limit(500)
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

  async setRefreshTokenHash(
    id: string,
    refresh_token_hash: string | null
  ): Promise<void> {
    await User.findByIdAndUpdate(id, {
      refresh_token_hash,
      ...(refresh_token_hash !== null && { last_login: new Date() }),
    });
  }

  async clearRefreshToken(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { refresh_token_hash: null });
  }

  /**
   * Atomically bump the failed-attempt counter and return the new value plus
   * the user's current lock state. Done in a single update so two concurrent
   * failed logins can't race past the threshold.
   */
  async incrementFailedLoginAttempts(
    id: string,
    lockIfAt: { threshold: number; lockUntil: Date }
  ): Promise<{ attempts: number; lockedUntil: Date | null } | null> {
    const updated = await User.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      [
        {
          $set: {
            failed_login_attempts: {
              $add: [{ $ifNull: ["$failed_login_attempts", 0] }, 1],
            },
          },
        },
        {
          $set: {
            locked_until: {
              $cond: [
                {
                  $gte: [
                    "$failed_login_attempts",
                    lockIfAt.threshold,
                  ],
                },
                lockIfAt.lockUntil,
                "$locked_until",
              ],
            },
          },
        },
      ],
      { new: true, projection: { failed_login_attempts: 1, locked_until: 1 } }
    );
    if (!updated) return null;
    return {
      attempts: updated.failed_login_attempts ?? 0,
      lockedUntil: updated.locked_until ?? null,
    };
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      failed_login_attempts: 0,
      locked_until: null,
    });
  }

  async setPasswordResetToken(
    id: string,
    tokenHash: string,
    expires: Date
  ): Promise<void> {
    await User.findByIdAndUpdate(id, {
      password_reset_token: tokenHash,
      password_reset_expires: expires,
    });
  }

  async findByPasswordResetToken(
    tokenHash: string
  ): Promise<IUserDocument | null> {
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
      failed_login_attempts: 0,
      locked_until: null,
    });
  }

  async setEmailVerificationToken(
    id: string,
    tokenHash: string,
    expires: Date
  ): Promise<void> {
    await User.findByIdAndUpdate(id, {
      email_verification_token: tokenHash,
      email_verification_expires: expires,
    });
  }

  async findByEmailVerificationToken(
    tokenHash: string
  ): Promise<IUserDocument | null> {
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
