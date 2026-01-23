import { Response } from "express";
import { reviewService } from "../../services/review/review.service";
import {
  createReviewSchema,
  updateReviewSchema,
  replyReviewSchema,
  getReviewsQuerySchema,
} from "../../validations/review/review.validation";
import { REVIEW_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import {
  AppError,
  extractUserIdFromRequest,
  R,
  validateWithSchema,
} from "../../utils";
import { userRepository } from "../../repositories";
import { UserRole } from "../../types/auth/user.types";

export class ReviewController {
  async createReview(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      createReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await reviewService.createReview(data, userId);
    R.created(res, result, REVIEW_MESSAGES.REVIEW_CREATED, req);
  }

  async getReviewById(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const result = await reviewService.getReviewById(id, userId, roleInfo);
    R.success(res, result, REVIEW_MESSAGES.REVIEW_FETCHED, req);
  }

  async getMyReviews(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getReviewsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    let result;
    if (roleInfo.isWorker) {
      result = await reviewService.getReviewsByWorker(userId, query);
    } else if (roleInfo.isClient) {
      result = await reviewService.getReviewsByClient(userId, query);
    } else {
      throw AppError.forbidden();
    }

    R.success(res, result, REVIEW_MESSAGES.REVIEWS_FETCHED, req);
  }

  async getAllReviews(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const userRoles = req.user.roles || [];
    if (!userRoles.includes(UserRole.ADMIN)) {
      throw AppError.forbidden();
    }

    const query = validateWithSchema(
      getReviewsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await reviewService.getAllReviews(query);
    R.success(res, result, REVIEW_MESSAGES.REVIEWS_FETCHED, req);
  }

  async updateReview(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updateReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user?.roles || [];
    const result = await reviewService.updateReview(
      id,
      data,
      userId,
      userRoles
    );
    R.success(res, result, REVIEW_MESSAGES.REVIEW_UPDATED, req);
  }

  async deleteReview(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const userRoles = req.user?.roles || [];
    await reviewService.deleteReview(id, userId, userRoles);
    R.success(res, null, REVIEW_MESSAGES.REVIEW_DELETED, req);
  }

  async replyToReview(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      replyReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user?.roles || [];
    const result = await reviewService.replyToReview(
      id,
      data.reply,
      userId,
      userRoles
    );
    R.success(res, result, REVIEW_MESSAGES.REVIEW_REPLIED, req);
  }

  async getReviewStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { workerId } = req.params;
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes(UserRole.ADMIN);
    const isWorker = userRoles.includes(UserRole.WORKER);

    if (!isAdmin && (!isWorker || userId !== workerId)) {
      throw AppError.forbidden();
    }

    const result = await reviewService.getReviewStatsByWorker(workerId);
    R.success(res, result, REVIEW_MESSAGES.REVIEWS_FETCHED, req);
  }
}

export const reviewController = new ReviewController();
