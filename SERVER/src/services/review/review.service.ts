import { Types } from "mongoose";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import {
  CreateReviewInput,
  ReviewQuery,
  IReviewDocument,
  UpdateReviewInput,
} from "../../types/review/review.types";
import { ReviewStatus, ReviewType } from "../../constants/review";
import { BookingStatus } from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { REVIEW_MESSAGES } from "../../constants/messages";
import { PaginationHelper } from "../../utils/pagination";
import { IBookingDocument, UserRole } from "../../types";
import { VALIDATION_LIMITS } from "../../constants/validation";

export class ReviewService {
  private async checkBookingExists(
    bookingId: string
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        REVIEW_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }
    return booking;
  }

  async createReview(
    input: CreateReviewInput,
    userId: string
  ): Promise<IReviewDocument> {
    const booking = await this.checkBookingExists(input.booking_id.toString());

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new AppError(
        REVIEW_MESSAGES.BOOKING_NOT_COMPLETED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const existingReview = await reviewRepository.findByBookingId(
      input.booking_id.toString()
    );

    if (existingReview) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT,
        ErrorCode.REVIEW_ALREADY_EXISTS
      );
    }

    const reviewData: CreateReviewInput = {
      ...input,
      client_id:
        input.review_type === ReviewType.CLIENT_TO_WORKER
          ? new Types.ObjectId(userId)
          : booking.client_id,
      worker_id:
        input.review_type === ReviewType.WORKER_TO_CLIENT
          ? new Types.ObjectId(userId)
          : booking.worker_id,
    };

    const review = await reviewRepository.create(reviewData);
    return review;
  }

  async getReviewById(
    reviewId: string,
    userId: string,
    roleInfo: {
      lastActiveRole: UserRole | null;
      isWorker: boolean;
      isClient: boolean;
    }
  ): Promise<IReviewDocument> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    const isAdmin = roleInfo.lastActiveRole === UserRole.ADMIN;
    const isOwner = roleInfo.isWorker && review.worker_id.toString() === userId;
    const isClient =
      roleInfo.isClient && review.client_id.toString() === userId;

    if (!isAdmin && !isOwner && !isClient && !review.is_visible) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    return review;
  }

  async getReviewsByWorker(
    workerId: string,
    query: ReviewQuery
  ): Promise<{
    data: IReviewDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const { reviews, total } = await reviewRepository.findByWorkerId(workerId, {
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(
      reviews,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async getReviewsByClient(
    clientId: string,
    query: ReviewQuery
  ): Promise<{
    data: IReviewDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const { reviews, total } = await reviewRepository.findByClientId(clientId, {
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(
      reviews,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async getAllReviews(query: ReviewQuery): Promise<{
    data: IReviewDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const { reviews, total } = await reviewRepository.findAll({
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(
      reviews,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async updateReview(
    reviewId: string,
    updateData: UpdateReviewInput,
    userId: string,
    userRoles: string[]
  ): Promise<IReviewDocument> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new AppError(
        REVIEW_MESSAGES.CANNOT_UPDATE_REVIEW,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.REVIEW_CANNOT_UPDATE
      );
    }

    const isAdmin = userRoles.includes(UserRole.ADMIN);
    const isOwner =
      review.client_id.toString() === userId ||
      review.worker_id.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    const updatedReview = await reviewRepository.update(reviewId, updateData);
    if (!updatedReview) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    return updatedReview;
  }

  async deleteReview(
    reviewId: string,
    userId: string,
    userRoles: string[]
  ): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    const isAdmin = userRoles.includes(UserRole.ADMIN);
    const isOwner =
      review.client_id.toString() === userId ||
      review.worker_id.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    const deleted = await reviewRepository.delete(reviewId);
    if (!deleted) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }
  }

  async replyToReview(
    reviewId: string,
    reply: string,
    workerId: string,
    userRoles: string[]
  ): Promise<IReviewDocument> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    const isAdmin = userRoles.includes("admin");
    if (!isAdmin && review.worker_id.toString() !== workerId) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    if (review.review_type !== ReviewType.CLIENT_TO_WORKER) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    const updatedReview = await reviewRepository.addReply(reviewId, reply);
    if (!updatedReview) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    return updatedReview;
  }

  async getReviewStatsByWorker(workerId: string): Promise<{
    total_reviews: number;
    average_rating: number;
    rating_distribution: {
      [key: string]: number;
    };
    average_rating_details: {
      professionalism: number;
      punctuality: number;
      communication: number;
      service_quality: number;
    };
  }> {
    return reviewRepository.getStatsByWorkerId(workerId);
  }
}

export const reviewService = new ReviewService();
