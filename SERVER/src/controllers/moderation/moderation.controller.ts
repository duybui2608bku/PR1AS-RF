import { Response } from "express";
import { moderationService } from "../../services/moderation";
import { postService } from "../../services/post";
import {
  blockUserSchema,
  createRestrictionSchema,
  reportPostSchema,
  reportQuerySchema,
  reportWorkerSchema,
  restrictionQuerySchema,
  updateReportStatusSchema,
} from "../../validations/moderation";
import { AuthRequest } from "../../middleware/auth";
import { COMMON_MESSAGES } from "../../constants/messages";
import { MODERATION_MESSAGES } from "../../constants/moderation";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class ModerationController {
  async blockUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      blockUserSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const block = await moderationService.blockUser(userId, input);
    R.success(res, block, MODERATION_MESSAGES.BLOCK_CREATED, req);
  }

  async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const result = await moderationService.unblockUser(
      userId,
      req.params.blocked_user_id
    );
    R.success(res, result, MODERATION_MESSAGES.BLOCK_REMOVED, req);
  }

  async listBlocks(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const blocks = await moderationService.listBlocks(userId);
    R.success(res, blocks, MODERATION_MESSAGES.BLOCKS_FETCHED, req);
  }

  async reportPost(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      reportPostSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const report = await moderationService.reportPost(userId, input);
    R.created(res, report, MODERATION_MESSAGES.REPORT_CREATED, req);
  }

  async reportWorker(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      reportWorkerSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const report = await moderationService.reportWorker(userId, input);
    R.created(res, report, MODERATION_MESSAGES.REPORT_CREATED, req);
  }

  async listReports(req: AuthRequest, res: Response): Promise<void> {
    const query = validateWithSchema(
      reportQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const reports = await moderationService.listReports(query);
    R.success(res, reports, MODERATION_MESSAGES.REPORTS_FETCHED, req);
  }

  async updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      updateReportStatusSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const report = await moderationService.updateReportStatus({
      reportId: req.params.id,
      status: input.status,
      adminId,
      adminNote: input.admin_note,
    });
    R.success(res, report, MODERATION_MESSAGES.REPORT_UPDATED, req);
  }

  async createRestriction(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      createRestrictionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const restriction = await moderationService.createRestriction({
      userId: input.user_id,
      feature: input.feature,
      reason: input.reason,
      endsAt: input.ends_at,
      adminId,
    });
    R.created(res, restriction, MODERATION_MESSAGES.RESTRICTION_CREATED, req);
  }

  async listRestrictions(req: AuthRequest, res: Response): Promise<void> {
    const query = validateWithSchema(
      restrictionQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const restrictions = await moderationService.listRestrictions(query);
    R.success(res, restrictions, MODERATION_MESSAGES.RESTRICTIONS_FETCHED, req);
  }

  async revokeRestriction(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const restriction = await moderationService.revokeRestriction(
      req.params.id,
      adminId
    );
    R.success(res, restriction, MODERATION_MESSAGES.RESTRICTION_REVOKED, req);
  }

  async deletePostAsAdmin(req: AuthRequest, res: Response): Promise<void> {
    await postService.softDeletePostAsAdmin(req.params.id);
    R.success(res, null, COMMON_MESSAGES.DELETED, req);
  }
}

export const moderationController = new ModerationController();
