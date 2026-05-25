import { Types } from "mongoose";
import { UserBlock, Report, UserRestriction } from "../../models/moderation";
import { postMediaRepository } from "../post/post-media.repository";
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

const USER_PUBLIC_FIELDS = "_id email full_name avatar roles worker_profile";

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

  // Fetch every block edge between a focal user and a list of others in ONE
  // query. Returns a map keyed by the other user's id; both incoming
  // (other→focal) and outgoing (focal→other) edges are surfaced so callers
  // can render the symmetric "either side has blocked" UI without N×2 lookups.
  async findBlockPairs(
    focalUserId: string,
    otherUserIds: string[]
  ): Promise<
    Map<
      string,
      {
        outgoing: IUserBlockDocument | null;
        incoming: IUserBlockDocument | null;
      }
    >
  > {
    const result = new Map<
      string,
      {
        outgoing: IUserBlockDocument | null;
        incoming: IUserBlockDocument | null;
      }
    >();
    if (otherUserIds.length === 0) return result;

    const focal = new Types.ObjectId(focalUserId);
    const others = otherUserIds.map((id) => new Types.ObjectId(id));

    const rows = await UserBlock.find({
      $or: [
        { blocker_id: focal, blocked_id: { $in: others } },
        { blocker_id: { $in: others }, blocked_id: focal },
      ],
    }).lean<IUserBlockDocument[]>();

    for (const id of otherUserIds) {
      result.set(id, { outgoing: null, incoming: null });
    }
    for (const row of rows) {
      const blockerId = row.blocker_id.toString();
      const blockedId = row.blocked_id.toString();
      if (blockerId === focalUserId) {
        const entry = result.get(blockedId);
        if (entry) entry.outgoing = row;
      } else {
        const entry = result.get(blockerId);
        if (entry) entry.incoming = row;
      }
    }
    return result;
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
    evidenceUrls?: string[];
  }): Promise<IReportDocument> {
    return new Report({
      reporter_id: new Types.ObjectId(data.reporterId),
      target_type: data.targetType,
      reason: data.reason,
      description: data.description,
      post_id: data.postId ? new Types.ObjectId(data.postId) : null,
      worker_id: data.workerId ? new Types.ObjectId(data.workerId) : null,
      target_user_id: data.targetUserId
        ? { _id: new Types.ObjectId(data.targetUserId) }
        : null,
      booking_id: data.bookingId ? new Types.ObjectId(data.bookingId) : null,
      evidence_urls: data.evidenceUrls ?? [],
      status: ReportStatus.OPEN,
      created_at: new Date(),
      updated_at: new Date(),
    }).save();
  }

  async findReportById(reportId: string): Promise<IReportDocument | null> {
    if (!Types.ObjectId.isValid(reportId)) return null;
    return Report.findById(reportId).lean<IReportDocument>();
  }

  async markReportPostDeleted(reportId: string): Promise<void> {
    await Report.findByIdAndUpdate(reportId, {
      post_deleted_at: new Date(),
      updated_at: new Date(),
    });
  }

  async attachReportRestriction(
    reportId: string,
    feature: RestrictionFeature,
    restrictionId: Types.ObjectId
  ): Promise<void> {
    const field =
      feature === RestrictionFeature.POST_CREATE
        ? "post_create_restriction_id"
        : "worker_activity_restriction_id";
    await Report.findByIdAndUpdate(reportId, {
      [field]: restrictionId,
      updated_at: new Date(),
    });
  }

  async setPendingResolutionNotify(
    reportId: string,
    notifyAt: Date
  ): Promise<void> {
    await Report.findByIdAndUpdate(reportId, {
      pending_resolution_notify_at: notifyAt,
      updated_at: new Date(),
    });
  }

  async clearPendingResolutionNotify(reportId: string): Promise<void> {
    await Report.findByIdAndUpdate(reportId, {
      pending_resolution_notify_at: null,
      updated_at: new Date(),
    });
  }

  async claimPendingResolutionNotify(
    reportId: string
  ): Promise<IReportDocument | null> {
    return Report.findOneAndUpdate(
      {
        _id: new Types.ObjectId(reportId),
        pending_resolution_notify_at: { $ne: null },
      },
      {
        $set: { pending_resolution_notify_at: null, updated_at: new Date() },
      },
      { new: true }
    ).lean<IReportDocument>();
  }

  async findDueResolutionNotifications(
    now: Date,
    limit = 50
  ): Promise<IReportDocument[]> {
    return Report.find({
      pending_resolution_notify_at: { $ne: null, $lte: now },
      target_type: ReportTargetType.WORKER,
    })
      .limit(limit)
      .lean<IReportDocument[]>();
  }

  async clearReportRestriction(restrictionId: string): Promise<void> {
    const id = new Types.ObjectId(restrictionId);
    await Report.updateMany(
      { post_create_restriction_id: id },
      { $set: { post_create_restriction_id: null, updated_at: new Date() } }
    );
    await Report.updateMany(
      { worker_activity_restriction_id: id },
      { $set: { worker_activity_restriction_id: null, updated_at: new Date() } }
    );
  }

  async hasOpenReportForPost(postId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(postId)) return false;
    const existing = await Report.exists({
      target_type: ReportTargetType.POST,
      post_id: new Types.ObjectId(postId),
      status: ReportStatus.OPEN,
    });
    return Boolean(existing);
  }

  async findOpenWorkerReport(
    reporterId: string,
    workerId: string
  ): Promise<IReportDocument | null> {
    return Report.findOne({
      reporter_id: new Types.ObjectId(reporterId),
      target_type: ReportTargetType.WORKER,
      worker_id: new Types.ObjectId(workerId),
      status: ReportStatus.OPEN,
    }).sort({ created_at: -1 });
  }

  async findOpenPostReport(
    reporterId: string,
    postId: string
  ): Promise<IReportDocument | null> {
    return Report.findOne({
      reporter_id: new Types.ObjectId(reporterId),
      target_type: ReportTargetType.POST,
      post_id: new Types.ObjectId(postId),
      status: ReportStatus.OPEN,
    }).sort({ created_at: -1 });
  }

  async listReports(query: ReportQuery): Promise<{
    reports: IReportDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (query.reporter_id && Types.ObjectId.isValid(query.reporter_id)) {
      filter.reporter_id = new Types.ObjectId(query.reporter_id);
    }
    if (query.target_type) filter.target_type = query.target_type;
    if (query.status) filter.status = query.status;

    if (query.start_date || query.end_date) {
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
      if (query.start_date) dateFilter.$gte = query.start_date;
      if (query.end_date) dateFilter.$lte = query.end_date;
      filter.created_at = dateFilter;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter_id", USER_PUBLIC_FIELDS)
        .populate("target_user_id", USER_PUBLIC_FIELDS)
        .populate("post_id", "body deleted deleted_at created_at")
        .populate("post_create_restriction_id", "status ends_at starts_at")
        .populate("worker_activity_restriction_id", "status ends_at starts_at")
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    const postIds = reports
      .map((report) => {
        const post = report.post_id as unknown;
        if (!post || typeof post !== "object" || !("_id" in post)) return null;
        return (post as { _id: Types.ObjectId })._id;
      })
      .filter((id): id is Types.ObjectId => Boolean(id));

    if (postIds.length > 0) {
      const mediaMap = await postMediaRepository.findByPostIds(postIds);
      for (const report of reports) {
        const post = report.post_id as unknown;
        if (!post || typeof post !== "object" || !("_id" in post)) continue;
        const postId = (post as { _id: Types.ObjectId })._id.toString();
        report.post_id = {
          ...(post as Record<string, unknown>),
          media: mediaMap.get(postId) ?? [],
        } as unknown as typeof report.post_id;
      }
    }

    return { reports: reports as IReportDocument[], total };
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
