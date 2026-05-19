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
import { POST_MESSAGES } from "../../constants/messages";
import type { ReportQuery, RestrictionQuery } from "../../types/moderation";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";
import { PaginationHelper } from "../../utils";
import { logger } from "../../utils/logger";
import { notificationEventService } from "../notification/notification-events.service";

const WORKER_REPORT_RESOLUTION_DEFER_MS = 60_000;

const extractAuthorId = (authorId: unknown): string => {
  if (!authorId) return "";
  if (authorId instanceof Types.ObjectId) return authorId.toString();
  if (typeof authorId === "object" && authorId !== null && "_id" in authorId) {
    const id = (authorId as { _id: Types.ObjectId | string })._id;
    return id instanceof Types.ObjectId ? id.toString() : String(id);
  }
  return String(authorId);
};

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
    const existingReport = await moderationRepository.findOpenPostReport(
      reporterId,
      input.post_id
    );
    if (existingReport) return existingReport;

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
      evidence_urls?: string[];
    }
  ) {
    const worker = await userRepository.findById(input.worker_id);
    if (!worker?.worker_profile) throw AppError.notFound();
    const existingReport = await moderationRepository.findOpenWorkerReport(
      reporterId,
      input.worker_id
    );
    if (existingReport) return existingReport;

    return moderationRepository.createReport({
      reporterId,
      targetType: ReportTargetType.WORKER,
      reason: input.reason,
      description: input.description,
      workerId: input.worker_id,
      targetUserId: input.worker_id,
      bookingId: input.booking_id ?? null,
      evidenceUrls: input.evidence_urls ?? [],
    });
  }

  async getOpenWorkerReport(reporterId: string, workerId: string) {
    return moderationRepository.findOpenWorkerReport(reporterId, workerId);
  }

  async getOpenPostReport(reporterId: string, postId: string) {
    return moderationRepository.findOpenPostReport(reporterId, postId);
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

  async listMyReports(reporterId: string, query: ReportQuery) {
    return this.listReports({ ...query, reporter_id: reporterId });
  }

  async updateReportStatus(input: {
    reportId: string;
    status: ReportStatus;
    adminId: string;
    adminNote?: string | null;
  }) {
    const report = await moderationRepository.updateReportStatus(input);
    if (!report) throw AppError.notFound(MODERATION_MESSAGES.REPORT_NOT_FOUND);

    if (
      input.status === ReportStatus.RESOLVED &&
      report.target_type === ReportTargetType.WORKER
    ) {
      const notifyAt = new Date(
        Date.now() + WORKER_REPORT_RESOLUTION_DEFER_MS
      );
      try {
        await moderationRepository.setPendingResolutionNotify(
          String(report._id),
          notifyAt
        );
      } catch (error) {
        logger.error("Failed to set pending resolution notify", error);
      }
    }

    return report;
  }

  async dispatchPendingWorkerResolutions(now = new Date()): Promise<number> {
    const due = await moderationRepository.findDueResolutionNotifications(now);
    let dispatched = 0;
    for (const candidate of due) {
      const claimed = await moderationRepository.claimPendingResolutionNotify(
        String(candidate._id)
      );
      if (!claimed) continue;
      if (claimed.worker_activity_restriction_id) {
        continue;
      }

      const workerId = extractAuthorId(
        claimed.target_user_id ?? claimed.worker_id
      );
      if (!workerId) continue;

      const restriction = await moderationRepository.findActiveRestriction(
        workerId,
        RestrictionFeature.WORKER_ACTIVITY
      );

      try {
        await notificationEventService.workerReportResolved({
          workerId,
          reportId: String(claimed._id),
          reportReason: claimed.reason,
          reportDescription: claimed.description,
          adminNote: claimed.admin_note ?? null,
          restriction: restriction
            ? {
                feature: RestrictionFeature.WORKER_ACTIVITY,
                endsAt: restriction.ends_at ?? null,
                reason: restriction.reason,
              }
            : null,
          adminId: claimed.resolved_by
            ? extractAuthorId(claimed.resolved_by)
            : "",
        });
        dispatched += 1;
      } catch (error) {
        logger.error(
          "Failed to dispatch deferred worker resolution notification",
          error
        );
      }
    }
    return dispatched;
  }

  async createRestriction(input: {
    userId: string;
    feature: RestrictionFeature;
    reason: string;
    endsAt?: Date | null;
    adminId: string;
    reportId?: string | null;
  }) {
    const user = await userRepository.findById(input.userId);
    if (!user) throw AppError.notFound();
    const restriction = await moderationRepository.createRestriction(input);
    if (input.reportId) {
      await moderationRepository.attachReportRestriction(
        input.reportId,
        input.feature,
        restriction._id as Types.ObjectId
      );
      if (input.feature === RestrictionFeature.WORKER_ACTIVITY) {
        await moderationRepository.clearPendingResolutionNotify(input.reportId);
      }
    }

    try {
      await notificationEventService.userRestrictionApplied({
        userId: input.userId,
        feature: input.feature,
        reason: input.reason,
        endsAt: input.endsAt ?? null,
        reportId: input.reportId ?? null,
        adminId: input.adminId,
        restrictionId: String(restriction._id),
      });
    } catch (error) {
      logger.error("Failed to notify user restriction applied", error);
    }

    return restriction;
  }

  async recordPostDeletedAction(reportId: string) {
    await moderationRepository.markReportPostDeleted(reportId);
  }

  async deletePostByAdmin(input: {
    postId: string;
    reportId?: string | null;
    adminId: string;
  }) {
    const post = await postRepository.findActiveByIdLean(input.postId);
    if (!post) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const authorId = extractAuthorId(post.author_id);
    const postBody = post.body || "";

    const deleted = await postRepository.softDeleteAsAdmin(input.postId);
    if (!deleted) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    let report = null;
    if (input.reportId) {
      await this.recordPostDeletedAction(input.reportId);
      report = await moderationRepository.findReportById(input.reportId);
    }

    if (!authorId) return;

    const restriction = await moderationRepository.findActiveRestriction(
      authorId,
      RestrictionFeature.POST_CREATE
    );

    try {
      await notificationEventService.postDeletedByAdmin({
        authorId,
        postId: input.postId,
        postBodyPreview: postBody,
        reportReason: report?.reason ?? null,
        reportDescription: report?.description ?? null,
        adminNote: report?.admin_note ?? null,
        restriction: restriction
          ? {
              feature: RestrictionFeature.POST_CREATE,
              endsAt: restriction.ends_at ?? null,
            }
          : null,
        adminId: input.adminId,
      });
    } catch (error) {
      logger.error("Failed to notify post deleted by admin", error);
    }
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
    await moderationRepository.clearReportRestriction(restrictionId);
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
