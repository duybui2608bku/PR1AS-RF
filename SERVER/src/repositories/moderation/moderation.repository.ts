import { Types } from "mongoose";
import { UserBlock, Report, UserRestriction } from "../../models/moderation";
import {
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
  RestrictionStatus,
} from "../../constants/moderation";
import type {
  IReportDocument,
  IUserBlockDocument,
  IUserRestrictionDocument,
  ReportQuery,
  RestrictionQuery,
} from "../../types/moderation";

const USER_PUBLIC_FIELDS = "email full_name avatar roles worker_profile";

export class ModerationRepository {
  async upsertBlock(input: {
    blockerId: string;
    blockedId: string;
    blockProfile: boolean;
    reason?: string | null;
  }): Promise<IUserBlockDocument> {
    const now = new Date();
    return UserBlock.findOneAndUpdate(
      {
        blocker_id: new Types.ObjectId(input.blockerId),
        blocked_id: new Types.ObjectId(input.blockedId),
      },
      {
        $set: {
          block_profile: input.blockProfile,
          reason: input.reason ?? null,
          updated_at: now,
        },
        $setOnInsert: {
          blocker_id: new Types.ObjectId(input.blockerId),
          blocked_id: new Types.ObjectId(input.blockedId),
          created_at: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("blocked_id", USER_PUBLIC_FIELDS) as Promise<IUserBlockDocument>;
  }

  async deleteBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await UserBlock.deleteOne({
      blocker_id: new Types.ObjectId(blockerId),
      blocked_id: new Types.ObjectId(blockedId),
    });
    return result.deletedCount > 0;
  }

  async listBlocks(blockerId: string): Promise<IUserBlockDocument[]> {
    return UserBlock.find({ blocker_id: new Types.ObjectId(blockerId) })
      .populate("blocked_id", USER_PUBLIC_FIELDS)
      .sort({ updated_at: -1 });
  }

  async findBlock(blockerId: string, blockedId: string) {
    return UserBlock.findOne({
      blocker_id: new Types.ObjectId(blockerId),
      blocked_id: new Types.ObjectId(blockedId),
    }).lean();
  }

  async getProfileBlockedIds(blockerId: string): Promise<string[]> {
    const rows = await UserBlock.find({
      blocker_id: new Types.ObjectId(blockerId),
      block_profile: true,
    })
      .select("blocked_id")
      .lean();
    return rows.map((row) => row.blocked_id.toString());
  }

  async getChatBlockBetween(userAId: string, userBId: string) {
    return UserBlock.findOne({
      $or: [
        {
          blocker_id: new Types.ObjectId(userAId),
          blocked_id: new Types.ObjectId(userBId),
        },
        {
          blocker_id: new Types.ObjectId(userBId),
          blocked_id: new Types.ObjectId(userAId),
        },
      ],
    }).lean();
  }

  async createReport(data: {
    reporterId: string;
    targetType: ReportTargetType;
    reason: string;
    description: string;
    postId?: string | null;
    workerId?: string | null;
    targetUserId?: string | null;
    bookingId?: string | null;
  }): Promise<IReportDocument> {
    return new Report({
      reporter_id: new Types.ObjectId(data.reporterId),
      target_type: data.targetType,
      reason: data.reason,
      description: data.description,
      post_id: data.postId ? new Types.ObjectId(data.postId) : null,
      worker_id: data.workerId ? new Types.ObjectId(data.workerId) : null,
      target_user_id: data.targetUserId
        ? new Types.ObjectId(data.targetUserId)
        : null,
      booking_id: data.bookingId ? new Types.ObjectId(data.bookingId) : null,
      status: ReportStatus.OPEN,
      created_at: new Date(),
      updated_at: new Date(),
    }).save();
  }

  async listReports(query: ReportQuery): Promise<{
    reports: IReportDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (query.target_type) filter.target_type = query.target_type;
    if (query.status) filter.status = query.status;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter_id", USER_PUBLIC_FIELDS)
        .populate("target_user_id", USER_PUBLIC_FIELDS)
        .populate("post_id", "body deleted_at created_at")
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      Report.countDocuments(filter),
    ]);

    return { reports, total };
  }

  async updateReportStatus(input: {
    reportId: string;
    status: ReportStatus;
    adminId: string;
    adminNote?: string | null;
  }): Promise<IReportDocument | null> {
    const resolved =
      input.status === ReportStatus.RESOLVED ||
      input.status === ReportStatus.REJECTED;
    return Report.findByIdAndUpdate(
      input.reportId,
      {
        status: input.status,
        admin_note: input.adminNote ?? null,
        resolved_by: resolved ? new Types.ObjectId(input.adminId) : null,
        resolved_at: resolved ? new Date() : null,
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  async createRestriction(input: {
    userId: string;
    feature: RestrictionFeature;
    reason: string;
    endsAt?: Date | null;
    adminId: string;
  }): Promise<IUserRestrictionDocument> {
    return new UserRestriction({
      user_id: new Types.ObjectId(input.userId),
      feature: input.feature,
      reason: input.reason,
      starts_at: new Date(),
      ends_at: input.endsAt ?? null,
      status: RestrictionStatus.ACTIVE,
      created_by: new Types.ObjectId(input.adminId),
      created_at: new Date(),
      updated_at: new Date(),
    }).save();
  }

  async listRestrictions(query: RestrictionQuery): Promise<{
    restrictions: IUserRestrictionDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (query.user_id && Types.ObjectId.isValid(query.user_id)) {
      filter.user_id = new Types.ObjectId(query.user_id);
    }
    if (query.feature) filter.feature = query.feature;
    if (query.status) filter.status = query.status;

    const [restrictions, total] = await Promise.all([
      UserRestriction.find(filter)
        .populate("user_id", USER_PUBLIC_FIELDS)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      UserRestriction.countDocuments(filter),
    ]);

    return { restrictions, total };
  }

  async revokeRestriction(
    restrictionId: string,
    adminId: string
  ): Promise<IUserRestrictionDocument | null> {
    return UserRestriction.findByIdAndUpdate(
      restrictionId,
      {
        status: RestrictionStatus.REVOKED,
        revoked_by: new Types.ObjectId(adminId),
        revoked_at: new Date(),
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  async findActiveRestriction(
    userId: string,
    feature: RestrictionFeature,
    now = new Date()
  ): Promise<IUserRestrictionDocument | null> {
    return UserRestriction.findOne({
      user_id: new Types.ObjectId(userId),
      feature,
      status: RestrictionStatus.ACTIVE,
      starts_at: { $lte: now },
      $or: [{ ends_at: null }, { ends_at: { $gt: now } }],
    }).lean() as Promise<IUserRestrictionDocument | null>;
  }

  async getActiveRestrictedUserIds(
    feature: RestrictionFeature,
    now = new Date()
  ): Promise<string[]> {
    const rows = await UserRestriction.find({
      feature,
      status: RestrictionStatus.ACTIVE,
      starts_at: { $lte: now },
      $or: [{ ends_at: null }, { ends_at: { $gt: now } }],
    })
      .select("user_id")
      .lean();

    return rows.map((row) => row.user_id.toString());
  }

  async expireRestrictions(now = new Date()): Promise<number> {
    const result = await UserRestriction.updateMany(
      {
        status: RestrictionStatus.ACTIVE,
        ends_at: { $ne: null, $lte: now },
      },
      { status: RestrictionStatus.EXPIRED, updated_at: now }
    );
    return result.modifiedCount;
  }
}

export const moderationRepository = new ModerationRepository();
