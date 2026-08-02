import { Document, Types } from "mongoose";

export enum ReputationHistoryReason {
  BOOKING_EXPIRY = "booking_expiry",
  WORKER_CANCEL = "worker_cancel",
  CLIENT_LATE_CANCEL = "client_late_cancel",
  LOW_REVIEW = "low_review",
  DAILY_RECOVERY = "daily_recovery",
  MANUAL = "manual",
  PROFILE_COMPLETENESS = "profile_completeness",
  REVIEW_RECEIVED = "review_received",
  FIVE_STAR_REVIEW = "five_star_review",
  JOB_COMPLETED = "job_completed",
  REPORT_FILED_VALID = "report_filed_valid",
  REPORTED_VALID = "reported_valid",
  LATE_COMPLETION = "late_completion",
  WORKER_CANCEL_MEDIUM = "worker_cancel_medium",
  WORKER_CANCEL_SEVERE = "worker_cancel_severe",
  WORKER_NO_SHOW = "worker_no_show",
}

export interface IReputationHistory {
  user_id: Types.ObjectId;
  delta: number;
  previous_score: number;
  new_score: number;
  reason: ReputationHistoryReason;
  created_at: Date;
}

export interface IReputationHistoryDocument
  extends IReputationHistory,
    Document {}

export interface ReputationHistoryQuery {
  page: number;
  limit: number;
  skip: number;
}
