export enum AnnouncementDisplayType {
  POPUP = "popup",
  BANNER = "banner",
  INLINE = "inline",
}

export enum AnnouncementDisplayBehavior {
  ALWAYS = "always",
  ONCE_SESSION = "once_session",
  ONCE_DEVICE = "once_device",
  ONCE_DAILY = "once_daily",
}

export enum AnnouncementTargetRole {
  CLIENT = "client",
  WORKER = "worker",
  ALL = "all",
}

export enum AnnouncementRedirectTarget {
  SELF = "_self",
  BLANK = "_blank",
}

export const ANNOUNCEMENT_MESSAGES = {
  CREATED: "Announcement created successfully",
  UPDATED: "Announcement updated successfully",
  DELETED: "Announcement deleted successfully",
  NOT_FOUND: "Announcement not found",
  FETCHED: "Announcements fetched successfully",
  BY_PLACEMENT_FETCHED: "Announcement fetched successfully",
} as const;
