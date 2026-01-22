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

export interface RatingDetails {
  professionalism: number;
  punctuality: number;
  communication: number;
  service_quality: number;
}

export interface CreateReviewInput {
  booking_id: string;
  worker_id: string;
  client_id: string;
  review_type: ReviewType;
  rating: number;
  rating_details: RatingDetails;
  comment: string;
}

export interface Review {
  _id: string;
  booking_id: string;
  worker_id: string;
  client_id: string;
  review_type: ReviewType;
  rating: number;
  rating_details: RatingDetails;
  comment: string;
  reply?: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}
