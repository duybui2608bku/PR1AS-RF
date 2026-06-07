export enum EmailCampaignStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  SENDING = "sending",
  SENT = "sent",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum EmailCampaignAudience {
  ALL = "all",
  CLIENTS = "clients",
  WORKERS = "workers",
}

export enum EmailSendLogStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
}

export const EMAIL_CAMPAIGN_MESSAGES = {
  CREATED: "Email campaign created successfully",
  UPDATED: "Email campaign updated successfully",
  DELETED: "Email campaign deleted successfully",
  SENT: "Email campaign sent successfully",
  SEND_STARTED: "Email campaign delivery started",
  NOT_FOUND: "Email campaign not found",
  CANNOT_EDIT: "Cannot edit a campaign that is already sending or sent",
  CANNOT_SEND: "Only draft or scheduled campaigns can be sent",
  CANNOT_DELETE: "Cannot delete a campaign that is currently sending",
  CAMPAIGNS_FETCHED: "Email campaigns fetched successfully",
  LOGS_FETCHED: "Email send logs fetched successfully",
  STATS_FETCHED: "Email campaign stats fetched successfully",
} as const;
