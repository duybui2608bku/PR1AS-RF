export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  HIDDEN = "hidden",
}

export enum ReviewType {
  CLIENT_TO_WORKER = "client_to_worker",
  WORKER_TO_CLIENT = "worker_to_client",
}

export const REVIEW_LIMITS = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 1000,
  MAX_REPLY_LENGTH: 500,
  RATING_DECIMAL_PLACES: 1,
  RATING_DETAILS_COUNT: 4,
  RATING_ROUNDING_MULTIPLIER: 10,
} as const;

export const RATING_VALUES = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
} as const;

export const REVIEW_WEIGHTS = {
  PROFESSIONALISM: 0.25,
  PUNCTUALITY: 0.25,
  COMMUNICATION: 0.25,
  SERVICE_QUALITY: 0.25,
} as const;
