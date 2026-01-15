import { Request, Response } from "express";
import { reviewService } from "../../services/review/review.service";
import {
  createReviewSchema,
  updateReviewSchema,
  replyReviewSchema,
  getReviewsQuerySchema,
} from "../../validations/review/review.validation";
import { REVIEW_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";

export class ReviewController {
  async createReview(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const data = validateWithSchema(
      createReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await reviewService.createReview(data, req.user.sub);
    R.created(res, result, REVIEW_MESSAGES.REVIEW_CREATED, req);
  }

  async getReviewById(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const userRoles = req.user.roles || [];
    const result = await reviewService.getReviewById(
      id,
      req.user.sub,
      userRoles
    );
    R.success(res, result, REVIEW_MESSAGES.REVIEW_FETCHED, req);
  }

  async getMyReviews(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const query = validateWithSchema(
      getReviewsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const isWorker = userRoles.includes("worker");
    const isClient = userRoles.includes("client");

    let result;
    if (isWorker) {
      result = await reviewService.getReviewsByWorker(req.user.sub, query);
    } else if (isClient) {
      result = await reviewService.getReviewsByClient(req.user.sub, query);
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
    if (!userRoles.includes("admin")) {
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
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const data = validateWithSchema(
      updateReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const result = await reviewService.updateReview(
      id,
      data,
      req.user.sub,
      userRoles
    );
    R.success(res, result, REVIEW_MESSAGES.REVIEW_UPDATED, req);
  }

  async deleteReview(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const userRoles = req.user.roles || [];
    await reviewService.deleteReview(id, req.user.sub, userRoles);
    R.success(res, null, REVIEW_MESSAGES.REVIEW_DELETED, req);
  }

  async replyToReview(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const data = validateWithSchema(
      replyReviewSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const result = await reviewService.replyToReview(
      id,
      data.reply,
      req.user.sub,
      userRoles
    );
    R.success(res, result, REVIEW_MESSAGES.REVIEW_REPLIED, req);
  }

  async getReviewStats(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { workerId } = req.params;
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.includes("admin");
    const isWorker = userRoles.includes("worker");

    if (!isAdmin && (!isWorker || req.user.sub !== workerId)) {
      throw AppError.forbidden();
    }

    const result = await reviewService.getReviewStatsByWorker(workerId);
    R.success(res, result, REVIEW_MESSAGES.REVIEWS_FETCHED, req);
  }
}

export const reviewController = new ReviewController();
