import { Types } from "mongoose";

export enum ReputationConfigKey {
  BOOKING_EXPIRY_DEDUCTION = "booking_expiry_deduction",
  // Deprecated: replaced by CANCEL_MEDIUM_PENALTY / CANCEL_SEVERE_PENALTY.
  // Kept so existing reputation_config rows and reputation_history entries
  // referencing this key stay valid; no code path writes to it anymore.
  WORKER_CANCEL_DEDUCTION = "worker_cancel_deduction",
  CLIENT_LATE_CANCEL_DEDUCTION = "client_late_cancel_deduction",
  LOW_REVIEW_DEDUCTION = "low_review_deduction",
  LOW_REVIEW_THRESHOLD = "low_review_threshold",
  DAILY_RECOVERY_POINTS = "daily_recovery_points",
  WARNING_THRESHOLD = "warning_threshold",
  PROFILE_PHOTOS_BONUS = "profile_photos_bonus",
  MIN_PROFILE_PHOTOS_THRESHOLD = "min_profile_photos_threshold",
  PROFILE_INFO_FIELD_BONUS = "profile_info_field_bonus",
  REVIEW_RECEIVED_BONUS = "review_received_bonus",
  FIVE_STAR_REVIEW_BONUS = "five_star_review_bonus",
  JOB_COMPLETION_BONUS = "job_completion_bonus",
  REPORT_FILED_VALID_BONUS = "report_filed_valid_bonus",
  REPORTED_VALID_PENALTY = "reported_valid_penalty",
  LATE_COMPLETION_PENALTY = "late_completion_penalty",
  CANCEL_MEDIUM_PENALTY = "cancel_medium_penalty",
  CANCEL_SEVERE_PENALTY = "cancel_severe_penalty",
  CANCEL_NOSHOW_PENALTY = "cancel_noshow_penalty",
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

export const TOGGLEABLE_REPUTATION_KEYS: ReadonlySet<ReputationConfigKey> =
  new Set([
    ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION,
    ReputationConfigKey.WORKER_CANCEL_DEDUCTION,
    ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION,
    ReputationConfigKey.LOW_REVIEW_DEDUCTION,
    ReputationConfigKey.DAILY_RECOVERY_POINTS,
    ReputationConfigKey.PROFILE_PHOTOS_BONUS,
    ReputationConfigKey.PROFILE_INFO_FIELD_BONUS,
    ReputationConfigKey.REVIEW_RECEIVED_BONUS,
    ReputationConfigKey.FIVE_STAR_REVIEW_BONUS,
    ReputationConfigKey.JOB_COMPLETION_BONUS,
    ReputationConfigKey.REPORT_FILED_VALID_BONUS,
    ReputationConfigKey.REPORTED_VALID_PENALTY,
    ReputationConfigKey.LATE_COMPLETION_PENALTY,
    ReputationConfigKey.CANCEL_MEDIUM_PENALTY,
    ReputationConfigKey.CANCEL_SEVERE_PENALTY,
    ReputationConfigKey.CANCEL_NOSHOW_PENALTY,
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
    description: "Deprecated — replaced by cancel_medium_penalty/cancel_severe_penalty. No longer applied.",
  },
  [ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION]: {
    value: 5,
    active: true,
    description:
      "Points deducted when a client cancels within CANCELLATION_FREE_HOURS of the booking start time",
  },
  [ReputationConfigKey.LOW_REVIEW_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Points deducted when a worker receives a review at or below the low-review threshold",
  },
  [ReputationConfigKey.LOW_REVIEW_THRESHOLD]: {
    value: 2,
    active: true,
    description: "Star rating at or below which a review triggers a deduction",
  },
  [ReputationConfigKey.DAILY_RECOVERY_POINTS]: {
    value: 5,
    active: true,
    description: "Points recovered daily for clients with reputation below max (100). Workers are excluded.",
  },
  [ReputationConfigKey.WARNING_THRESHOLD]: {
    value: 70,
    active: true,
    description: "Reputation score below which a warning notification is sent",
  },
  [ReputationConfigKey.PROFILE_PHOTOS_BONUS]: {
    value: 10,
    active: true,
    description: "Worker points awarded once gallery photo count reaches min_profile_photos_threshold",
  },
  [ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD]: {
    value: 5,
    active: true,
    description: "Minimum gallery photo count required to earn profile_photos_bonus",
  },
  [ReputationConfigKey.PROFILE_INFO_FIELD_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded per filled profile info field (up to 10 fields)",
  },
  [ReputationConfigKey.REVIEW_RECEIVED_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded when a client review is received, any rating",
  },
  [ReputationConfigKey.FIVE_STAR_REVIEW_BONUS]: {
    value: 5,
    active: true,
    description: "Additional worker points when a received review's rating is 5",
  },
  [ReputationConfigKey.JOB_COMPLETION_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded when a booking they worked reaches completed",
  },
  [ReputationConfigKey.REPORT_FILED_VALID_BONUS]: {
    value: 10,
    active: true,
    description: "Worker points awarded when a report they filed is resolved as valid",
  },
  [ReputationConfigKey.REPORTED_VALID_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted when a report against them is resolved as valid",
  },
  [ReputationConfigKey.LATE_COMPLETION_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted when a started booking is auto-completed for missing the on-time close-out",
  },
  [ReputationConfigKey.CANCEL_MEDIUM_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted for cancelling 30 minutes to 2 hours before the booking start time",
  },
  [ReputationConfigKey.CANCEL_SEVERE_PENALTY]: {
    value: 20,
    active: true,
    description: "Worker points deducted for cancelling less than 30 minutes before the booking start time",
  },
  [ReputationConfigKey.CANCEL_NOSHOW_PENALTY]: {
    value: 30,
    active: true,
    description: "Worker points deducted when a worker-no-show dispute resolves in favor of the client",
  },
};
