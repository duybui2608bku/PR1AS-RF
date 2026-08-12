import {
  Ban,
  Building2,
  CalendarClock,
  Cookie,
  FileText,
  FileWarning,
  Gift,
  Lock,
  Mail,
  MessageSquarePlus,
  // Scale, // tạm ẩn cùng link Trách nhiệm pháp lý
  Star,
  Trash2,
  UserX,
} from "lucide-react"
import type * as React from "react"

import { siteConfig } from "@/config/site"

// Danh mục các mục trong Cài đặt. Tách khỏi trang để trang Hồ sơ (mobile) dựng
// được cùng danh sách mà không nhân đôi label/icon — panel vẫn ở /settings.
export type SettingsSection =
  | "blocked"
  | "post-reports"
  | "worker-reports"
  | "reputation"
  | "referral"
  | "feedback"
  | "delete-account"

export const sectionMeta: Record<
  SettingsSection,
  {
    labelKey: string
    descriptionKey: string
    icon: React.ComponentType<{ className?: string }>
    danger?: boolean
  }
> = {
  blocked: {
    labelKey: "blockedLabel",
    descriptionKey: "blockedDesc",
    icon: Ban,
  },
  "post-reports": {
    labelKey: "postReportsLabel",
    descriptionKey: "postReportsDesc",
    icon: FileWarning,
  },
  "worker-reports": {
    labelKey: "workerReportsLabel",
    descriptionKey: "workerReportsDesc",
    icon: UserX,
  },
  reputation: {
    labelKey: "reputationLabel",
    descriptionKey: "reputationDesc",
    icon: Star,
  },
  referral: {
    labelKey: "referralLabel",
    descriptionKey: "referralDesc",
    icon: Gift,
  },
  feedback: {
    labelKey: "feedbackLabel",
    descriptionKey: "feedbackDesc",
    icon: MessageSquarePlus,
  },
  "delete-account": {
    labelKey: "deleteLabel",
    descriptionKey: "deleteDesc",
    icon: Trash2,
    danger: true,
  },
}

export const sectionGroups: Array<{
  titleKey: string
  items: SettingsSection[]
}> = [
  {
    titleKey: "groupSafety",
    items: ["blocked", "post-reports", "worker-reports"],
  },
  { titleKey: "groupAccount", items: ["reputation", "referral", "feedback"] },
  { titleKey: "groupDanger", items: ["delete-account"] },
]

// Trang thông tin, pháp lý và liên hệ — trước đây nằm ở footer (đã ẩn trên mobile).
export const infoLinks: Array<{
  href: string
  labelKey: string
  descriptionKey?: string
  descriptionRaw?: string
  icon: React.ComponentType<{ className?: string }>
  external?: boolean
}> = [
  {
    href: "/about",
    labelKey: "aboutLabel",
    descriptionKey: "aboutDesc",
    icon: Building2,
  },
  {
    href: "/privacy",
    labelKey: "privacyLabel",
    descriptionKey: "privacyDesc",
    icon: Lock,
  },
  {
    href: "/terms",
    labelKey: "termsLabel",
    descriptionKey: "termsDesc",
    icon: FileText,
  },
  // Tạm thời ẩn link Trách nhiệm pháp lý (trang đang ẩn). Bật lại: bỏ comment
  // (và bỏ comment import Scale).
  // {
  //   href: "/legal-responsibility",
  //   labelKey: "legalRespLabel",
  //   descriptionKey: "legalRespDesc",
  //   icon: Scale,
  // },
  {
    href: "/cookies",
    labelKey: "cookiesLabel",
    descriptionKey: "cookiesDesc",
    icon: Cookie,
  },
  {
    href: "/booking-process",
    labelKey: "bookingProcessLabel",
    descriptionKey: "bookingProcessDesc",
    icon: CalendarClock,
  },
  {
    href: `mailto:${siteConfig.contactEmail}`,
    labelKey: "contactLabel",
    descriptionRaw: siteConfig.contactEmail,
    icon: Mail,
    external: true,
  },
]
