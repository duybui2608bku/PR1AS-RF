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

/**
 * Locales an email campaign can be authored in. Mirrors the platform's
 * UI-switchable locales (see pr1as-client `lib/locale.ts` and the
 * site-settings `LocalizedText` shape). Recipients whose `meta_data.locale`
 * is outside this set (e.g. "ko") fall back to the campaign's default locale.
 */
export const EMAIL_CAMPAIGN_LOCALES = ["vi", "en", "zh"] as const;
export type EmailCampaignLocale = (typeof EMAIL_CAMPAIGN_LOCALES)[number];
export const DEFAULT_CAMPAIGN_LOCALE: EmailCampaignLocale = "vi";

/**
 * Maps an arbitrary user locale (e.g. `meta_data.locale`, which may be "ko" or
 * unset) onto one of the campaign-supported locales, falling back to the
 * campaign's default when there is no authored translation for it.
 */
export function resolveCampaignLocale(
  raw: string | null | undefined,
  fallback: EmailCampaignLocale
): EmailCampaignLocale {
  if (raw && (EMAIL_CAMPAIGN_LOCALES as readonly string[]).includes(raw)) {
    return raw as EmailCampaignLocale;
  }
  return fallback;
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
