export enum FeedbackType {
  BUG = "bug",
  FEATURE = "feature",
}

export enum FeedbackStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  REJECTED = "rejected",
}

export const FEEDBACK_MESSAGES = {
  FEEDBACK_CREATED: "Feedback submitted successfully",
  FEEDBACKS_FETCHED: "Feedback fetched successfully",
  FEEDBACK_UPDATED: "Feedback updated successfully",
  FEEDBACK_NOT_FOUND: "Feedback not found",
} as const;
