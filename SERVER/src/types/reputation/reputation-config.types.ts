import { Types } from "mongoose";

export enum ReputationConfigKey {
  BOOKING_EXPIRY_DEDUCTION = "booking_expiry_deduction",
  WORKER_CANCEL_DEDUCTION = "worker_cancel_deduction",
  CLIENT_LATE_CANCEL_DEDUCTION = "client_late_cancel_deduction",
  LOW_REVIEW_DEDUCTION = "low_review_deduction",
  LOW_REVIEW_THRESHOLD = "low_review_threshold",
  DAILY_RECOVERY_POINTS = "daily_recovery_points",
  WARNING_THRESHOLD = "warning_threshold",
}

export interface IReputationConfigDocument {
  _id: Types.ObjectId;
  key: ReputationConfigKey;
  value: number;
  active: boolean;
  description: string;
  updated_by: Types.ObjectId | null;
  updated_at: Date;
}

/**
 * Keys that represent an actual point-scoring action (add/subtract reputation).
 * Only these can be toggled on/off via the `active` flag — when inactive, the
 * corresponding deduction/recovery is skipped. The remaining keys are pure
 * thresholds and are always evaluated.
 */
export const TOGGLEABLE_REPUTATION_KEYS: ReadonlySet<ReputationConfigKey> =
  new Set([
    ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION,
    ReputationConfigKey.WORKER_CANCEL_DEDUCTION,
    ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION,
    ReputationConfigKey.LOW_REVIEW_DEDUCTION,
    ReputationConfigKey.DAILY_RECOVERY_POINTS,
  ]);

export const REPUTATION_CONFIG_DEFAULTS: Record<
  ReputationConfigKey,
  { value: number; active: boolean; description: string }
> = {
  [ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Points deducted when a booking expires without worker confirmation",
  },
  [ReputationConfigKey.WORKER_CANCEL_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Points deducted when a worker cancels a confirmed booking",
  },
  [ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION]: {
    value: 5,
    active: true,
    description:
      "Points deducted when a client cancels within CANCELLATION_FREE_HOURS of the booking start time",
  },
  [ReputationConfigKey.LOW_REVIEW_DEDUCTION]: {
    value: 5,
    active: true,
    description: "Points deducted when a worker receives a low-star review",
  },
  [ReputationConfigKey.LOW_REVIEW_THRESHOLD]: {
    value: 2,
    active: true,
    description: "Star rating at or below which a review triggers a deduction",
  },
  [ReputationConfigKey.DAILY_RECOVERY_POINTS]: {
    value: 5,
    active: true,
    description: "Points recovered daily for users with reputation below max (100)",
  },
  [ReputationConfigKey.WARNING_THRESHOLD]: {
    value: 70,
    active: true,
    description: "Reputation score below which a warning notification is sent",
  },
};
