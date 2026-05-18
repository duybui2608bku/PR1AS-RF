import { Types } from "mongoose";

export enum ReputationConfigKey {
  BOOKING_EXPIRY_DEDUCTION = "booking_expiry_deduction",
  WORKER_CANCEL_DEDUCTION = "worker_cancel_deduction",
  LOW_REVIEW_DEDUCTION = "low_review_deduction",
  LOW_REVIEW_THRESHOLD = "low_review_threshold",
  DAILY_RECOVERY_POINTS = "daily_recovery_points",
  WARNING_THRESHOLD = "warning_threshold",
}

export interface IReputationConfigDocument {
  _id: Types.ObjectId;
  key: ReputationConfigKey;
  value: number;
  description: string;
  updated_by: Types.ObjectId | null;
  updated_at: Date;
}

export const REPUTATION_CONFIG_DEFAULTS: Record<
  ReputationConfigKey,
  { value: number; description: string }
> = {
  [ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION]: {
    value: 10,
    description: "Points deducted when a booking expires without worker confirmation",
  },
  [ReputationConfigKey.WORKER_CANCEL_DEDUCTION]: {
    value: 10,
    description: "Points deducted when a worker cancels a confirmed booking",
  },
  [ReputationConfigKey.LOW_REVIEW_DEDUCTION]: {
    value: 5,
    description: "Points deducted when a worker receives a low-star review",
  },
  [ReputationConfigKey.LOW_REVIEW_THRESHOLD]: {
    value: 2,
    description: "Star rating at or below which a review triggers a deduction",
  },
  [ReputationConfigKey.DAILY_RECOVERY_POINTS]: {
    value: 5,
    description: "Points recovered daily for users with reputation below max (100)",
  },
  [ReputationConfigKey.WARNING_THRESHOLD]: {
    value: 70,
    description: "Reputation score below which a warning notification is sent",
  },
};
