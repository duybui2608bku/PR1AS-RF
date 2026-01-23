import { Document, Types } from "mongoose";
import { ReviewStatus, ReviewType } from "../../constants/review";

export interface ReviewRatingDetails {
  professionalism: number;
  punctuality: number;
  communication: number;
  service_quality: number;
}

export interface IReview {
  booking_id: Types.ObjectId;
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;

  review_type: ReviewType;

  rating: number;
  rating_details: ReviewRatingDetails;
  comment: string;

  status: ReviewStatus;
  is_visible: boolean;

  worker_reply: string | null;
  worker_replied_at: Date | null;

  helpful_count: number;
  reported_count: number;

  created_at: Date;
  updated_at: Date;
}

export interface IReviewDocument extends IReview, Document {}

export interface CreateReviewInput {
  booking_id: Types.ObjectId;
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  review_type: ReviewType;
  rating: number;
  rating_details: ReviewRatingDetails;
  comment: string;
}

export interface UpdateReviewInput {
  rating?: number;
  rating_details?: ReviewRatingDetails;
  comment?: string;
}

export interface ReplyReviewInput {
  review_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  reply: string;
}

export interface ReviewQuery {
  worker_id?: string;
  client_id?: string;
  booking_id?: string | Types.ObjectId;
  review_type?: ReviewType;
  status?: ReviewStatus;
  min_rating?: number;
  max_rating?: number;
  is_visible?: boolean;
  page?: number;
  limit?: number;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  average_rating_details: ReviewRatingDetails;
}
