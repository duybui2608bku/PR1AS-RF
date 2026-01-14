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
} as const;

export const REVIEW_WEIGHTS = {
  PROFESSIONALISM: 0.25,
  PUNCTUALITY: 0.25,
  COMMUNICATION: 0.25,
  SERVICE_QUALITY: 0.25,
} as const;
