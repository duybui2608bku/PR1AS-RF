import { Types } from "mongoose";
import { Review } from "../../models/review/review.model";
import {
  IReviewDocument,
  CreateReviewInput,
  ReviewQuery,
} from "../../types/review/review.types";
import { REVIEW_LIMITS, RATING_VALUES } from "../../constants/review";
import { VALIDATION_LIMITS } from "../../constants/validation";

export class ReviewRepository {
  async create(data: CreateReviewInput): Promise<IReviewDocument> {
    const review = new Review({
      ...data,
      is_visible: true,
      helpful_count: 0,
      reported_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return review.save();
  }

  async findById(id: string): Promise<IReviewDocument | null> {
    return Review.findById(id)
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id");
  }

  async findByBookingId(bookingId: string): Promise<IReviewDocument | null> {
    return Review.findOne({ booking_id: new Types.ObjectId(bookingId) })
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id");
  }

  async findByWorkerId(
    workerId: string,
    query: ReviewQuery
  ): Promise<{ reviews: IReviewDocument[]; total: number }> {
    const filter: Record<string, any> = {
      worker_id: new Types.ObjectId(workerId),
    };

    if (query.review_type) {
      filter.review_type = query.review_type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.is_visible !== undefined) {
      filter.is_visible = query.is_visible;
    }

    if (query.min_rating || query.max_rating) {
      filter.rating = {};
      if (query.min_rating) {
        filter.rating.$gte = query.min_rating;
      }
      if (query.max_rating) {
        filter.rating.$lte = query.max_rating;
      }
    }

    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("client_id", "email full_name avatar")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      reviews: reviews as IReviewDocument[],
      total,
    };
  }

  async findByClientId(
    clientId: string,
    query: ReviewQuery
  ): Promise<{ reviews: IReviewDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      client_id: new Types.ObjectId(clientId),
    };

    if (query.review_type) {
      filter.review_type = query.review_type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.is_visible !== undefined) {
      filter.is_visible = query.is_visible;
    }

    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      reviews: reviews as IReviewDocument[],
      total,
    };
  }

  async findAll(query: ReviewQuery): Promise<{
    reviews: IReviewDocument[];
    total: number;
  }> {
    const filter: Record<string, any> = {};

    if (query.worker_id) {
      filter.worker_id = new Types.ObjectId(query.worker_id.toString());
    }

    if (query.client_id) {
      filter.client_id = new Types.ObjectId(query.client_id.toString());
    }

    if (query.booking_id) {
      filter.booking_id = new Types.ObjectId(query.booking_id.toString());
    }

    if (query.review_type) {
      filter.review_type = query.review_type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.is_visible !== undefined) {
      filter.is_visible = query.is_visible;
    }

    if (query.min_rating || query.max_rating) {
      filter.rating = {};
      if (query.min_rating) {
        filter.rating.$gte = query.min_rating;
      }
      if (query.max_rating) {
        filter.rating.$lte = query.max_rating;
      }
    }

    const page = query.page || VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE;
    const limit = query.limit || VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return {
      reviews: reviews as IReviewDocument[],
      total,
    };
  }

  async update(
    id: string,
    updateData: Partial<IReviewDocument>
  ): Promise<IReviewDocument | null> {
    return Review.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updated_at: new Date(),
      },
      { new: true }
    )
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id");
  }

  async addReply(id: string, reply: string): Promise<IReviewDocument | null> {
    return Review.findByIdAndUpdate(
      id,
      {
        worker_reply: reply,
        worker_replied_at: new Date(),
        updated_at: new Date(),
      },
      { new: true }
    )
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id");
  }

  async delete(id: string): Promise<boolean> {
    const result = await Review.findByIdAndDelete(id);
    return !!result;
  }

  async getStatsByWorkerId(workerId: string): Promise<{
    total_reviews: number;
    average_rating: number;
    rating_distribution: {
      "1": number;
      "2": number;
      "3": number;
      "4": number;
      "5": number;
    };
    average_rating_details: {
      professionalism: number;
      punctuality: number;
      communication: number;
      service_quality: number;
    };
  }> {
    const reviews = await Review.find({
      worker_id: new Types.ObjectId(workerId),
      is_visible: true,
    }).lean();

    if (reviews.length === 0) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: {
          [RATING_VALUES.ONE.toString()]: 0,
          [RATING_VALUES.TWO.toString()]: 0,
          [RATING_VALUES.THREE.toString()]: 0,
          [RATING_VALUES.FOUR.toString()]: 0,
          [RATING_VALUES.FIVE.toString()]: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        average_rating_details: {
          professionalism: 0,
          punctuality: 0,
          communication: 0,
          service_quality: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = {
      [RATING_VALUES.ONE.toString()]: 0,
      [RATING_VALUES.TWO.toString()]: 0,
      [RATING_VALUES.THREE.toString()]: 0,
      [RATING_VALUES.FOUR.toString()]: 0,
      [RATING_VALUES.FIVE.toString()]: 0,
    };

    reviews.forEach((review) => {
      const rating = Math.round(review.rating);
      if (
        rating >= REVIEW_LIMITS.MIN_RATING &&
        rating <= REVIEW_LIMITS.MAX_RATING
      ) {
        ratingDistribution[
          rating.toString() as keyof typeof ratingDistribution
        ]++;
      }
    });

    const totalDetails = reviews.reduce(
      (acc, review) => ({
        professionalism:
          acc.professionalism + review.rating_details.professionalism,
        punctuality: acc.punctuality + review.rating_details.punctuality,
        communication: acc.communication + review.rating_details.communication,
        service_quality:
          acc.service_quality + review.rating_details.service_quality,
      }),
      {
        professionalism: 0,
        punctuality: 0,
        communication: 0,
        service_quality: 0,
      }
    );

    const averageRatingDetails = {
      professionalism: totalDetails.professionalism / reviews.length,
      punctuality: totalDetails.punctuality / reviews.length,
      communication: totalDetails.communication / reviews.length,
      service_quality: totalDetails.service_quality / reviews.length,
    };

    return {
      total_reviews: reviews.length,
      average_rating:
        Math.round(averageRating * REVIEW_LIMITS.RATING_ROUNDING_MULTIPLIER) /
        REVIEW_LIMITS.RATING_ROUNDING_MULTIPLIER,
      rating_distribution: {
        "1": ratingDistribution["1"],
        "2": ratingDistribution["2"],
        "3": ratingDistribution["3"],
        "4": ratingDistribution["4"],
        "5": ratingDistribution["5"],
      },
      average_rating_details: averageRatingDetails,
    };
  }
}

export const reviewRepository = new ReviewRepository();
