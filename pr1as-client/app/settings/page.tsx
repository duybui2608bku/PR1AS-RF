"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Ban,
  Bug,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Eye,
  FileText,
  FileWarning,
  Lightbulb,
  Loader2,
  Lock,
  Mail,
  MessageSquarePlus,
  // Scale, // tạm ẩn cùng link Trách nhiệm pháp lý
  Send,
  ShieldCheck,
  Star,
  Trash2,
  User,
  UserX,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  useDeleteAccount,
  useDeletionStatus,
  useForgotPassword,
} from "@/lib/hooks/use-auth"
import { useCreateFeedback, useMyFeedback } from "@/lib/hooks/use-feedback"
import {
  useBlockedUsers,
  useMyReports,
  useUnblockUser,
} from "@/lib/hooks/use-moderation"
import { useReputationHistory } from "@/lib/hooks/use-reputation"
import { siteConfig } from "@/config/site"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import {
  extractAccountDeleteBlockers,
  getErrorMessage,
  type AccountDeleteBlocker,
} from "@/lib/utils/error-handler"
import {
  getReputationBadgeClass,
  getReputationScore,
} from "@/lib/utils/reputation"
import type {
  ModerationReport,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserBlock,
} from "@/services/moderation.service"
import type {
  ReputationHistory,
  ReputationHistoryReason,
} from "@/services/reputation.service"
import type {
  Feedback,
  FeedbackStatus,
  FeedbackType,
} from "@/services/feedback.service"

type SettingsSection =
  | "blocked"
  | "post-reports"
  | "worker-reports"
  | "reputation"
  | "feedback"
  | "delete-account"

type SettingsTranslator = ReturnType<typeof useTranslations>

const useLocaleTag = () => {
  const locale = useLocale() as SupportedLocale
  return INTL_LOCALE_TAGS[locale] ?? "vi-VN"
}

const sectionMeta: Record<
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

const sectionGroups: Array<{ titleKey: string; items: SettingsSection[] }> = [
  {
    titleKey: "groupSafety",
    items: ["blocked", "post-reports", "worker-reports"],
  },
  { titleKey: "groupAccount", items: ["reputation", "feedback"] },
  { titleKey: "groupDanger", items: ["delete-account"] },
]

// Các hàng điều hướng tới trang riêng (không phải panel trong settings).
const navLinks: Array<{
  href: string
  labelKey: string
  descriptionKey: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    href: "/client/profile",
    labelKey: "profileLabel",
    descriptionKey: "profileDesc",
    icon: User,
  },
]

// Trang thông tin, pháp lý và liên hệ — trước đây nằm ở footer (đã ẩn trên mobile).
const infoLinks: Array<{
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

const feedbackStatusKeys: Record<FeedbackStatus, string> = {
  open: "fbStatusOpen",
  in_progress: "fbStatusInProgress",
  resolved: "fbStatusResolved",
  rejected: "fbStatusRejected",
}

const feedbackStatusVariants: Record<
  FeedbackStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  rejected: "destructive",
}

const feedbackTypeKeys: Record<FeedbackType, string> = {
  bug: "fbTypeBug",
  feature: "fbTypeFeature",
}

const statusKeys: Record<ReportStatus, string> = {
  open: "reportStatusOpen",
  reviewing: "reportStatusReviewing",
  resolved: "reportStatusResolved",
  rejected: "reportStatusRejected",
}

const reasonKeys: Record<ReportReason, string> = {
  scam: "reasonScam",
  low_quality: "reasonLowQuality",
  harassment: "reasonHarassment",
  fake_profile: "reasonFakeProfile",
  other: "reasonOther",
}

const reputationReasonKeys: Record<ReputationHistoryReason, string> = {
  booking_expiry: "repBookingExpiry",
  worker_cancel: "repWorkerCancel",
  low_review: "repLowReview",
  daily_recovery: "repDailyRecovery",
  manual: "repManual",
}

const statusVariants: Record<
  ReportStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  reviewing: "default",
  resolved: "outline",
  rejected: "destructive",
}

function formatDateTime(value?: string | null, localeTag = "vi-VN") {
  if (!value) return "-"
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function getBlockedUser(block: UserBlock, defaultName: string) {
  const blocked = block.blocked_id
  if (typeof blocked === "object" && blocked) {
    const id = blocked._id ?? blocked.id
    return {
      id,
      name: blocked.full_name || blocked.email || id || defaultName,
      email: blocked.email ?? "",
    }
  }

  return { id: String(blocked), name: String(blocked), email: "" }
}

function getObjectId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object" && "id" in value) {
    return String((value as { id: unknown }).id)
  }
  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id)
  }
  return null
}

function getDisplayName(value: unknown) {
  if (!value || typeof value !== "object") return "-"
  const user = value as { full_name?: string | null; email?: string | null }
  return user.full_name || user.email || "-"
}

function getPostPreview(value: unknown, t: SettingsTranslator) {
  if (!value || typeof value !== "object") return t("postFallback")
  const post = value as {
    body?: string | null
    deleted?: boolean
    deleted_at?: string | null
  }
  if (post.deleted || post.deleted_at) return t("postDeleted")
  const body = post.body?.trim()
  return body
    ? body.length > 96
      ? `${body.slice(0, 96)}...`
      : body
    : t("postFallback")
}

function getReportedPost(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      body: "",
      deleted: false,
      created_at: null as string | null,
      media: [] as Array<{
        id: string
        type: string
        url: string
      }>,
    }
  }

  const post = value as {
    body?: string | null
    deleted?: boolean
    deleted_at?: string | null
    created_at?: string | null
    media?: Array<{
      id?: string
      _id?: string
      type?: string
      url?: string
    }>
  }

  return {
    body: post.body?.trim() ?? "",
    deleted: Boolean(post.deleted || post.deleted_at),
    created_at: post.created_at ?? null,
    media: (post.media ?? [])
      .filter((item) => item.url)
      .map((item) => ({
        id: String(item.id ?? item._id ?? item.url),
        type: item.type ?? "image",
        url: item.url ?? "",
      })),
  }
}

function ReportOutcome({ report }: { report: ModerationReport }) {
  const t = useTranslations("Settings")
  const hasRestriction =
    Boolean(report.post_create_restriction_id) ||
    Boolean(report.worker_activity_restriction_id)
  if (report.post_deleted_at) {
    return <Badge variant="outline">{t("postDeleted")}</Badge>
  }
  if (hasRestriction) {
    return <Badge variant="outline">{t("outcomeRestricted")}</Badge>
  }
  if (report.status === "resolved") {
    return <Badge variant="outline">{t("outcomeResolvedNoAction")}</Badge>
  }
  if (report.status === "rejected") {
    return <Badge variant="destructive">{t("outcomeNoViolation")}</Badge>
  }
  return <Badge variant="secondary">{t("outcomePending")}</Badge>
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <Icon className="size-9" />
      <p className="text-sm">{title}</p>
    </div>
  )
}

function BlockedList() {
  const t = useTranslations("Settings")
  const blocksQuery = useBlockedUsers()
  const unblockMutation = useUnblockUser()
  const blocks = blocksQuery.data ?? []

  if (blocksQuery.isLoading) return <LoadingPanel />
  if (blocks.length === 0) {
    return <EmptyState icon={Ban} title={t("noBlocked")} />
  }

  return (
    <div className="divide-y">
      {blocks.map((block) => {
        const user = getBlockedUser(block, t("defaultUser"))
        return (
          <div
            key={block.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email || t("noEmail")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {block.block_profile
                  ? t("blockingProfile")
                  : t("blockingChatOnly")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unblockMutation.isPending || !user.id}
                >
                  {t("unblock")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("unblockTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("unblockDesc", { name: user.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:space-x-0">
                  <AlertDialogCancel className="mt-0">
                    {t("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={unblockMutation.isPending || !user.id}
                    onClick={() => {
                      if (!user.id) return
                      unblockMutation.mutate(user.id)
                    }}
                  >
                    {t("confirmUnblock")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      })}
    </div>
  )
}

function ReportedPostDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ModerationReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("Settings")
  const post = getReportedPost(report?.post_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("postDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted/30 p-4">
            {post.body ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {post.body}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noPostContent")}
              </p>
            )}
          </div>

          {post.media.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {post.media.map((item) =>
                item.type === "video" ? (
                  <video
                    key={item.id}
                    src={item.url}
                    controls
                    className="w-full rounded-md border bg-background"
                  />
                ) : (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative block aspect-square overflow-hidden rounded-md border bg-muted"
                  >
                    <Image
                      src={item.url}
                      alt={t("postImageAlt")}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover"
                    />
                  </a>
                )
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportsList({ targetType }: { targetType: ReportTargetType }) {
  const t = useTranslations("Settings")
  const localeTag = useLocaleTag()
  const [previewReport, setPreviewReport] =
    React.useState<ModerationReport | null>(null)
  const reportsQuery = useMyReports({
    page: 1,
    limit: 30,
    target_type: targetType,
  })
  const reports = reportsQuery.data?.data ?? []

  if (reportsQuery.isLoading) return <LoadingPanel />
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={targetType === "post" ? FileWarning : UserX}
        title={
          targetType === "post"
            ? t("noPostReports")
            : t("noWorkerReports")
        }
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {reports.map((report) => {
          const id =
            report.id ??
            report._id ??
            `${report.target_type}-${report.created_at}`
          const workerId = getObjectId(report.target_user_id)
          return (
            <div key={id} className="rounded-md border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariants[report.status]}>
                      {t(statusKeys[report.status])}
                    </Badge>
                    <ReportOutcome report={report} />
                  </div>
                  <p className="font-medium">
                    {targetType === "worker" && workerId ? (
                      <Link
                        href={`/worker/${workerId}`}
                        className="text-primary hover:underline"
                      >
                        {getDisplayName(report.target_user_id)}
                      </Link>
                    ) : (
                      getPostPreview(report.post_id, t)
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("reasonLabel")} {t(reasonKeys[report.reason])} ·{" "}
                    {formatDateTime(report.created_at, localeTag)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  {targetType === "post" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewReport(report)}
                    >
                      <Eye className="size-4" />
                      {t("viewPost")}
                    </Button>
                  ) : null}
                  {report.admin_note ? (
                    <div className="max-w-sm rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">{t("adminNote")} </span>
                      {report.admin_note}
                    </div>
                  ) : null}
                </div>
              </div>
              {report.description ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {report.description}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      <ReportedPostDialog
        report={previewReport}
        open={Boolean(previewReport)}
        onOpenChange={(open) => {
          if (!open) setPreviewReport(null)
        }}
      />
    </>
  )
}

function ReputationPanel() {
  const t = useTranslations("Settings")
  const localeTag = useLocaleTag()
  const user = useAuthStore((state) => state.user)
  const score = getReputationScore(user?.meta_data?.reputation_score)
  const historyQuery = useReputationHistory({ page: 1, limit: 30 })
  const histories = historyQuery.data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-background p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("currentScore")}</p>
            <p className="text-3xl font-semibold tracking-tight">{score}/100</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              getReputationBadgeClass(score)
            )}
          >
            {score < 30
              ? t("scoreNeedsImprovement")
              : score < 70
                ? t("scoreStable")
                : t("scoreGood")}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${score}%` }} />
        </div>
      </div>

      {historyQuery.isLoading ? (
        <LoadingPanel />
      ) : histories.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("noHistory")} />
      ) : (
        <div className="divide-y rounded-md border bg-background">
          {histories.map((item: ReputationHistory) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {t(reputationReasonKeys[item.reason])}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.previous_score} → {item.new_score} ·{" "}
                  {formatDateTime(item.created_at, localeTag)}
                </p>
              </div>
              <Badge variant={item.delta >= 0 ? "outline" : "destructive"}>
                {item.delta >= 0 ? "+" : ""}
                {item.delta}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackPanel() {
  const t = useTranslations("Settings")
  const localeTag = useLocaleTag()
  const createMutation = useCreateFeedback()
  const feedbackQuery = useMyFeedback({ page: 1, limit: 30 })
  const feedbacks = feedbackQuery.data?.data ?? []

  const [type, setType] = React.useState<FeedbackType>("bug")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !createMutation.isPending

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    createMutation.mutate(
      {
        type,
        title: title.trim(),
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setTitle("")
          setDescription("")
          setType("bug")
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-md border bg-background p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="feedback-type">{t("feedbackTypeLabel")}</Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as FeedbackType)}
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="feedback-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">
                <Bug className="size-4" />
                {t("feedbackTypeBugOption")}
              </SelectItem>
              <SelectItem value="feature">
                <Lightbulb className="size-4" />
                {t("feedbackTypeFeatureOption")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-title">{t("titleLabel")}</Label>
          <Input
            id="feedback-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === "bug"
                ? t("titlePlaceholderBug")
                : t("titlePlaceholderFeature")
            }
            maxLength={200}
            disabled={createMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-description">{t("descLabel")}</Label>
          <Textarea
            id="feedback-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              type === "bug"
                ? t("descPlaceholderBug")
                : t("descPlaceholderFeature")
            }
            maxLength={5000}
            className="min-h-32"
            disabled={createMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">{t("minChars")}</p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t("submitFeedback")}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("sentFeedback")}</h3>
        {feedbackQuery.isLoading ? (
          <LoadingPanel />
        ) : feedbacks.length === 0 ? (
          <EmptyState icon={MessageSquarePlus} title={t("noFeedback")} />
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback: Feedback) => {
              const id = feedback.id ?? feedback._id ?? feedback.created_at
              return (
                <div key={id} className="rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {feedback.type === "bug" ? (
                        <Bug className="size-3.5" />
                      ) : (
                        <Lightbulb className="size-3.5" />
                      )}
                      {t(feedbackTypeKeys[feedback.type])}
                    </Badge>
                    <Badge variant={feedbackStatusVariants[feedback.status]}>
                      {t(feedbackStatusKeys[feedback.status])}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(feedback.created_at, localeTag)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{feedback.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                    {feedback.description}
                  </p>
                  {feedback.admin_note ? (
                    <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">{t("adminReply")} </span>
                      {feedback.admin_note}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="flex min-h-52 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)

function blockerMessage(
  blocker: AccountDeleteBlocker,
  t: SettingsTranslator
): string {
  switch (blocker.code) {
    case "WALLET_BALANCE":
      return t("blockerWallet", { amount: formatVND(blocker.detail) })
    case "ACTIVE_BOOKINGS":
      return t("blockerBookings", { count: blocker.detail })
    case "OPEN_DISPUTES":
      return t("blockerDisputes", { count: blocker.detail })
  }
}

function DeleteAccountPanel() {
  const t = useTranslations("Settings")
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const statusQuery = useDeletionStatus(true)
  const deleteMutation = useDeleteAccount()
  const forgotPasswordMutation = useForgotPassword()
  const [password, setPassword] = React.useState("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [submitBlockers, setSubmitBlockers] = React.useState<
    AccountDeleteBlocker[]
  >([])

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      toast.error(t("emailNotFound"))
      return
    }
    try {
      const response = await forgotPasswordMutation.mutateAsync({
        email: user.email,
      })
      if (response.success) {
        toast.success(t("resetEmailSent"))
      } else {
        toast.error(getErrorMessage(response.error, t("resetEmailError")))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("resetEmailError")))
    }
  }

  const handleSubmit = async () => {
    setSubmitBlockers([])
    try {
      await deleteMutation.mutateAsync({ password })
      toast.success(t("deleteRequested"))
      setConfirmOpen(false)
      router.replace("/login")
    } catch (error) {
      const list = extractAccountDeleteBlockers(error)
      if (list.length > 0) {
        // Server gate fired between pre-check and submit (e.g. a new booking
        // came in). Surface the fresh blockers and close the dialog.
        setSubmitBlockers(list)
        setConfirmOpen(false)
        statusQuery.refetch()
        return
      }
      toast.error(getErrorMessage(error, t("deleteError")))
    }
  }

  if (statusQuery.isLoading) return <LoadingPanel />

  if (statusQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("statusLoadError")}</AlertTitle>
        <AlertDescription>
          {getErrorMessage(statusQuery.error, t("tryAgainLater"))}
        </AlertDescription>
      </Alert>
    )
  }

  const status = statusQuery.data
  const blockers =
    submitBlockers.length > 0 ? submitBlockers : (status?.blockers ?? [])
  const canSubmit = status?.has_password && blockers.length === 0

  return (
    <div className="space-y-5">
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("recoveryWarningTitle")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{t("recoveryWarning1")}</p>
          <p>{t("recoveryWarning2")}</p>
        </AlertDescription>
      </Alert>

      <div className="rounded-md border bg-background p-4">
        <h3 className="font-medium">{t("beforeDeleteTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{t("beforeDelete1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{t("beforeDelete2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{t("beforeDelete3")}</span>
          </li>
        </ul>
      </div>

      {blockers.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("cannotDeleteTitle")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blockers.map((blocker) => (
                <li key={blocker.code}>{blockerMessage(blocker, t)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {status && !status.has_password ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("needPasswordTitle")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t("needPasswordDesc")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendResetEmail}
              disabled={forgotPasswordMutation.isPending || !user?.email}
            >
              {forgotPasswordMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("sendResetEmail")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setPassword("")
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            className="h-11 w-full"
          >
            <Trash2 className="size-4" />
            {t("deleteMyAccount")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-account-password">
              {t("currentPassword")}
            </Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={deleteMutation.isPending}
              placeholder={t("passwordPlaceholder")}
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel
              className="mt-0"
              disabled={deleteMutation.isPending}
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || password.length === 0}
              onClick={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SectionContent({ section }: { section: SettingsSection }) {
  if (section === "blocked") return <BlockedList />
  if (section === "post-reports") return <ReportsList targetType="post" />
  if (section === "worker-reports") return <ReportsList targetType="worker" />
  if (section === "feedback") return <FeedbackPanel />
  if (section === "delete-account") return <DeleteAccountPanel />
  return <ReputationPanel />
}

export default function SettingsPage() {
  const t = useTranslations("Settings")
  // null = đang ở màn danh sách (mobile). Desktop luôn hiển thị 2 cột.
  const [activeSection, setActiveSection] =
    React.useState<SettingsSection | null>(null)
  const desktopActive: SettingsSection = activeSection ?? "blocked"
  const activeMeta = sectionMeta[desktopActive]
  const ActiveIcon = activeMeta.icon

  return (
    <div className="container mx-auto w-full pb-10 sm:px-4 sm:py-8">
      {/* Tiêu đề trang — ẩn khi đang ở màn chi tiết trên mobile */}
      <div
        className={cn(
          "mb-6 flex items-center gap-3 px-4 pt-4 sm:px-0 sm:pt-0",
          activeSection !== null && "max-lg:hidden"
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="mb-1">
            {t("pageTitle")}
          </h1>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[19rem_1fr] lg:gap-6">
        {/* DANH SÁCH MỤC — list trên mobile, sidebar trên desktop */}
        <aside className={cn(activeSection !== null && "max-lg:hidden")}>
          <nav className="space-y-6 lg:sticky lg:top-20 lg:space-y-5">
            <div className="lg:hidden">
              <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-1">
                {t("profileHeader")}
              </p>
              <div className="divide-y border-y bg-card sm:overflow-hidden sm:rounded-xl sm:border lg:space-y-0.5 lg:divide-y-0 lg:border-0 lg:bg-transparent lg:p-1.5">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-accent/60 lg:rounded-lg lg:py-2.5 lg:hover:bg-accent"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t(link.labelKey)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground lg:hidden">
                          {t(link.descriptionKey)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                    </Link>
                  )
                })}
              </div>
            </div>
            {sectionGroups.map((group) => (
              <div key={group.titleKey}>
                <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-1">
                  {t(group.titleKey)}
                </p>
                <div className="divide-y border-y bg-card sm:overflow-hidden sm:rounded-xl sm:border lg:space-y-0.5 lg:divide-y-0 lg:border-0 lg:bg-transparent lg:p-1.5">
                  {group.items.map((id) => {
                    const meta = sectionMeta[id]
                    const Icon = meta.icon
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveSection(id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-accent/60 lg:rounded-lg lg:py-2.5 lg:hover:bg-accent",
                          desktopActive === id && "lg:bg-accent",
                          meta.danger && "text-destructive"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            meta.danger
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {t(meta.labelKey)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground lg:hidden">
                            {t(meta.descriptionKey)}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="lg:hidden">
              <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-1">
                {t("infoHeader")}
              </p>
              <div className="divide-y border-y bg-card sm:overflow-hidden sm:rounded-xl sm:border lg:space-y-0.5 lg:divide-y-0 lg:border-0 lg:bg-transparent lg:p-1.5">
                {infoLinks.map((link) => {
                  const Icon = link.icon
                  const rowClass =
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-accent/60 lg:rounded-lg lg:py-2.5 lg:hover:bg-accent"
                  const inner = (
                    <>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {t(link.labelKey)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground lg:hidden">
                          {link.descriptionKey
                            ? t(link.descriptionKey)
                            : link.descriptionRaw}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                    </>
                  )
                  return link.external ? (
                    <a key={link.href} href={link.href} className={rowClass}>
                      {inner}
                    </a>
                  ) : (
                    <Link key={link.href} href={link.href} className={rowClass}>
                      {inner}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </aside>

        {/* CHI TIẾT */}
        <section className={cn(activeSection === null && "max-lg:hidden")}>
          {/* Header quay lại — chỉ mobile */}
          <div
            className="sticky z-30 mb-4 flex h-12 items-center gap-1 border-b bg-background/80 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
          >
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              aria-label={t("back")}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="truncate text-base font-semibold tracking-tight">
              {t(activeMeta.labelKey)}
            </h2>
          </div>

          <Card className="border-0 bg-transparent p-4 shadow-none sm:border sm:bg-card sm:p-5 lg:p-6">
            {/* Header mục — chỉ desktop */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <ActiveIcon className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    {t(activeMeta.labelKey)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(activeMeta.descriptionKey)}
                  </p>
                </div>
              </div>
              <Separator className="my-5" />
            </div>
            <SectionContent section={desktopActive} />
          </Card>
        </section>
      </div>
    </div>
  )
}
