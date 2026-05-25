import { Document, Types } from "mongoose";

export enum ReputationHistoryReason {
  BOOKING_EXPIRY = "booking_expiry",
  WORKER_CANCEL = "worker_cancel",
  CLIENT_LATE_CANCEL = "client_late_cancel",
  LOW_REVIEW = "low_review",
  DAILY_RECOVERY = "daily_recovery",
  MANUAL = "manual",
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
