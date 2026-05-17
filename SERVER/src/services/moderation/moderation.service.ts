import { Types } from "mongoose";
import { userRepository } from "../../repositories/auth/user.repository";
import { postRepository } from "../../repositories/post/post.repository";
import { moderationRepository } from "../../repositories/moderation";
import {
  MODERATION_MESSAGES,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
} from "../../constants/moderation";
import type { ReportQuery, RestrictionQuery } from "../../types/moderation";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";
import { PaginationHelper } from "../../utils";

export class ModerationService {
  async blockUser(
    blockerId: string,
    input: {
      blocked_user_id: string;
      block_profile?: boolean;
      reason?: string | null;
    }
  ) {
    if (blockerId === input.blocked_user_id) {
      throw new AppError(
        MODERATION_MESSAGES.CANNOT_BLOCK_SELF,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const blocked = await userRepository.findById(input.blocked_user_id);
    if (!blocked) throw AppError.notFound();

    return moderationRepository.upsertBlock({
      blockerId,
      blockedId: input.blocked_user_id,
      blockProfile: Boolean(input.block_profile),
      reason: input.reason ?? null,
    });
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    await moderationRepository.deleteBlock(blockerId, blockedUserId);
    return { blocked_user_id: blockedUserId, blocked: false };
  }

  async listBlocks(blockerId: string) {
    return moderationRepository.listBlocks(blockerId);
  }

  async ensureChatAllowed(userAId: string, userBId: string): Promise<void> {
    const block = await moderationRepository.getChatBlockBetween(
      userAId,
      userBId
    );
    if (!block) return;

    throw new AppError(
      MODERATION_MESSAGES.USER_BLOCKED,
      HTTP_STATUS.FORBIDDEN,
      ErrorCode.FORBIDDEN
    );
  }

  async getProfileBlockedIds(userId?: string): Promise<string[]> {
    if (!userId) return [];
    return moderationRepository.getProfileBlockedIds(userId);
  }

  async isProfileBlocked(viewerId: string | undefined, targetUserId: string) {
    if (!viewerId) return false;
    const block = await moderationRepository.findBlock(viewerId, targetUserId);
    return Boolean(block?.block_profile);
  }

  async reportPost(
    reporterId: string,
    input: { post_id: string; reason: ReportReason; description: string }
  ) {
    const post = await postRepository.findActiveByIdLean(input.post_id);
    if (!post) throw AppError.notFound();
    const authorId = String(
      typeof post.author_id === "object" && "_id" in post.author_id
        ? (post.author_id as { _id: Types.ObjectId })._id
        : post.author_id
    );
    return moderationRepository.createReport({
      reporterId,
      targetType: ReportTargetType.POST,
      reason: input.reason,
      description: input.description,
      postId: input.post_id,
      targetUserId: authorId,
    });
  }

  async reportWorker(
    reporterId: string,
    input: {
      worker_id: string;
      reason: ReportReason;
      description: string;
      booking_id?: string;
    }
  ) {
    const worker = await userRepository.findById(input.worker_id);
    if (!worker?.worker_profile) throw AppError.notFound();
    return moderationRepository.createReport({
      reporterId,
      targetType: ReportTargetType.WORKER,
      reason: input.reason,
      description: input.description,
      workerId: input.worker_id,
      targetUserId: input.worker_id,
      bookingId: input.booking_id ?? null,
    });
  }

  async listReports(query: ReportQuery) {
    const { reports, total } = await moderationRepository.listReports(query);
    return PaginationHelper.formatResponse(
      reports,
      query.page,
      query.limit,
      total
    );
  }

  async updateReportStatus(input: {
    reportId: string;
    status: ReportStatus;
    adminId: string;
    adminNote?: string | null;
  }) {
    const report = await moderationRepository.updateReportStatus(input);
    if (!report) throw AppError.notFound(MODERATION_MESSAGES.REPORT_NOT_FOUND);
    return report;
  }

  async createRestriction(input: {
    userId: string;
    feature: RestrictionFeature;
    reason: string;
    endsAt?: Date | null;
    adminId: string;
  }) {
    const user = await userRepository.findById(input.userId);
    if (!user) throw AppError.notFound();
    return moderationRepository.createRestriction(input);
  }

  async listRestrictions(query: RestrictionQuery) {
    const { restrictions, total } =
      await moderationRepository.listRestrictions(query);
    return PaginationHelper.formatResponse(
      restrictions,
      query.page,
      query.limit,
      total
    );
  }

  async revokeRestriction(restrictionId: string, adminId: string) {
    const restriction = await moderationRepository.revokeRestriction(
      restrictionId,
      adminId
    );
    if (!restriction) {
      throw AppError.notFound(MODERATION_MESSAGES.RESTRICTION_NOT_FOUND);
    }
    return restriction;
  }

  async assertNoActiveRestriction(
    userId: string,
    feature: RestrictionFeature
  ): Promise<void> {
    const restriction = await moderationRepository.findActiveRestriction(
      userId,
      feature
    );
    if (!restriction) return;

    throw new AppError(
      feature === RestrictionFeature.POST_CREATE
        ? MODERATION_MESSAGES.POST_RESTRICTED
        : MODERATION_MESSAGES.WORKER_RESTRICTED,
      HTTP_STATUS.FORBIDDEN,
      ErrorCode.FORBIDDEN
    );
  }
}

export const moderationService = new ModerationService();
