export enum ReportTargetType {
  POST = "post",
  WORKER = "worker",
}

export enum ReportReason {
  SCAM = "scam",
  LOW_QUALITY = "low_quality",
  HARASSMENT = "harassment",
  FAKE_PROFILE = "fake_profile",
  OTHER = "other",
}

export enum ReportStatus {
  OPEN = "open",
  REVIEWING = "reviewing",
  RESOLVED = "resolved",
  REJECTED = "rejected",
}

export enum RestrictionFeature {
  POST_CREATE = "post_create",
  WORKER_ACTIVITY = "worker_activity",
}

export enum RestrictionStatus {
  ACTIVE = "active",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

export const MODERATION_MESSAGES = {
  BLOCK_CREATED: "User block saved successfully",
  BLOCK_REMOVED: "User block removed successfully",
  BLOCKS_FETCHED: "Blocked users fetched successfully",
  USER_BLOCKED: "This chat is blocked",
  CANNOT_BLOCK_SELF: "You cannot block yourself",
  REPORT_CREATED: "Report created successfully",
  REPORTS_FETCHED: "Reports fetched successfully",
  REPORT_UPDATED: "Report updated successfully",
  REPORT_NOT_FOUND: "Report not found",
  RESTRICTION_CREATED: "Restriction created successfully",
  RESTRICTIONS_FETCHED: "Restrictions fetched successfully",
  RESTRICTION_REVOKED: "Restriction revoked successfully",
  RESTRICTION_NOT_FOUND: "Restriction not found",
  POST_RESTRICTED: "You are not allowed to create posts right now",
  WORKER_RESTRICTED: "This worker is not available right now",
} as const;
