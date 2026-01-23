import mongoose, { Schema } from "mongoose";
import { ReviewType, REVIEW_LIMITS } from "../../constants/review";
import { IReviewDocument } from "../../types/review";
import { modelsName } from "../models.name";

const ratingDetailsSchema = new Schema(
  {
    professionalism: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
    },
    punctuality: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
    },
    communication: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
    },
    service_quality: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
    },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReviewDocument>(
  {
    booking_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.BOOKING,
      required: true,
      index: true,
    },
    client_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    review_type: {
      type: String,
      enum: Object.values(ReviewType),
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.MIN_RATING,
      max: REVIEW_LIMITS.MAX_RATING,
      index: true,
    },
    rating_details: {
      type: ratingDetailsSchema,
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: REVIEW_LIMITS.MIN_COMMENT_LENGTH,
      maxlength: REVIEW_LIMITS.MAX_COMMENT_LENGTH,
    },
    is_visible: {
      type: Boolean,
      default: true,
      index: true,
    },
    worker_reply: {
      type: String,
      default: null,
      trim: true,
      maxlength: REVIEW_LIMITS.MAX_REPLY_LENGTH,
    },
    worker_replied_at: {
      type: Date,
      default: null,
    },
    helpful_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    reported_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.REVIEW,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reviewSchema.index({ booking_id: 1 }, { unique: true });
reviewSchema.index({ worker_id: 1, is_visible: 1, rating: -1 });
reviewSchema.index({ client_id: 1, created_at: -1 });
reviewSchema.index({ review_type: 1, status: 1 });
reviewSchema.index({ rating: 1, is_visible: 1 });
reviewSchema.index({ worker_id: 1, review_type: 1, is_visible: 1 });

export const Review = mongoose.model<IReviewDocument>(
  modelsName.REVIEW,
  reviewSchema
);
