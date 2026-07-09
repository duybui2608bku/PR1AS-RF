"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Eye,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react"
import { formatDistanceToNow, type Locale } from "date-fns"
import { enUS, ko, vi, zhCN } from "date-fns/locale"
import { useLocale } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useGetPost } from "@/lib/hooks/use-posts"
import {
  useAdminDeletePost,
  useAdminReports,
  useCreateRestriction,
  useRevokeRestriction,
  useUpdateReportStatus,
} from "@/lib/hooks/use-moderation"
import type {
  ModerationReport,
  ReportReason,
  ReportRestrictionRef,
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
} from "@/services/moderation.service"

const ALL = "all"

const DATE_FNS_LOCALES: Record<string, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
  ko,
}

const reportStatusOptions: Array<{ value: ReportStatus; label: string }> = [
  { value: "open", label: "Đang mở" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "rejected", label: "Đã từ chối" },
]

const targetTypeOptions: Array<{ value: ReportTargetType; label: string }> = [
  { value: "post", label: "Bài viết" },
  { value: "worker", label: "Worker" },
]

const reportReasonLabels: Record<ReportReason, string> = {
  scam: "Lừa đảo",
  low_quality: "Chất lượng thấp",
  harassment: "Quấy rối",
  fake_profile: "Hồ sơ giả mạo",
  other: "Khác",
}

const targetTypeLabels: Record<ReportTargetType, string> =
  targetTypeOptions.reduce(
    (labels, option) => ({ ...labels, [option.value]: option.label }),
    {} as Record<ReportTargetType, string>
  )

const reportStatusLabels: Record<ReportStatus, string> =
  reportStatusOptions.reduce(
    (labels, option) => ({ ...labels, [option.value]: option.label }),
    {} as Record<ReportStatus, string>
  )

const statusBadgeVariant: Record<
  ReportStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  reviewing: "default",
  resolved: "outline",
  rejected: "destructive",
}

function getReportReasonLabel(reason: ReportReason): string {
  return reportReasonLabels[reason] ?? reason
}

function getReportStatusLabel(status: ReportStatus): string {
  return reportStatusLabels[status] ?? status
}

function getTargetTypeLabel(type: ReportTargetType): string {
  return targetTypeLabels[type] ?? type
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

function getDisplayName(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const user = value as { full_name?: string | null; email?: string | null }
  return user.full_name || user.email || "-"
}

function getWorkerProfileSummary(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const user = value as {
    worker_profile?: {
      experience?: string | null
      introduction?: string | null
    } | null
  }
  const profile = user.worker_profile
  return profile?.experience || profile?.introduction || null
}

function getPostPreview(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const post = value as {
    body?: string | null
    deleted?: boolean
    deleted_at?: string | null
  }
  const body = post.body ?? ""
  const preview = body.length > 80 ? `${body.slice(0, 80)}...` : body || "-"
  return post.deleted || post.deleted_at ? `${preview} (đã xóa)` : preview
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function parseFilterDate(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatFilterDate(date?: Date) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toStartOfDayISO(value: string) {
  if (!value) return undefined
  return new Date(`${value}T00:00:00.000`).toISOString()
}

function toEndOfDayISO(value: string) {
  if (!value) return undefined
  return new Date(`${value}T23:59:59.999`).toISOString()
}

function asRestrictionRef(
  value: ReportRestrictionRef | string | null | undefined
): ReportRestrictionRef | null {
  if (!value || typeof value !== "object") return null
  return value
}

function isRestrictionActive(ref: ReportRestrictionRef | null): boolean {
  return Boolean(ref && ref.status === "active")
}

type StatusDialogState = { id: string; status: ReportStatus }
type RestrictionDialogState = {
  reportId: string
  userId: string
  feature: RestrictionFeature
  targetLabel: string
  autoChained?: boolean
}
type RevokeDialogState = {
  restrictionId: string
  feature: RestrictionFeature
  targetLabel: string
}
type DeletePostDialogState = { reportId: string; postId: string }

type ActionOption = {
  value: string
  label: string
}

function getActionOptions(report: ModerationReport): ActionOption[] {
  const opts: ActionOption[] = []
  const postRestriction = asRestrictionRef(report.post_create_restriction_id)
  const workerRestriction = asRestrictionRef(
    report.worker_activity_restriction_id
  )

  if (report.status === "open" || report.status === "reviewing") {
    opts.push({ value: "status:resolved", label: "Đánh dấu đã xử lý" })
    opts.push({ value: "status:rejected", label: "Từ chối" })
    if (report.status === "open") {
      opts.push({ value: "status:reviewing", label: "Đang xem xét" })
    }
    return opts
  }

  if (report.status !== "resolved") return opts

  if (report.target_type === "post") {
    if (!report.post_deleted_at) {
      opts.push({ value: "delete_post", label: "Xóa bài" })
    }
    if (isRestrictionActive(postRestriction)) {
      opts.push({ value: "revoke:post_create", label: "Gỡ cấm đăng bài" })
    } else {
      opts.push({ value: "restrict:post_create", label: "Cấm đăng bài" })
    }
  }

  if (report.target_type === "worker") {
    if (isRestrictionActive(workerRestriction)) {
      opts.push({
        value: "revoke:worker_activity",
        label: "Gỡ cấm hoạt động worker",
      })
    } else {
      opts.push({
        value: "restrict:worker_activity",
        label: "Cấm hoạt động worker",
      })
    }
  }

  return opts
}

function PostPreviewDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const locale = useLocale()
  const dateLocale = DATE_FNS_LOCALES[locale] ?? vi
  const { data: post, isLoading, error } = useGetPost(
    open && postId ? postId : ""
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết bài viết</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !post ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Không tải được bài viết. Có thể bài đã bị xóa.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.full_name ?? "Avatar"}
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="size-10 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {post.author.full_name ?? "Người dùng"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {post.body}
            </p>
            {post.media.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {post.media.map((item) =>
                  item.type === "video" ? (
                    <video
                      key={item.id}
                      src={item.url}
                      controls
                      className="w-full rounded-md border"
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
                        alt="Hình ảnh bài viết"
                        fill
                        sizes="(max-width: 768px) 50vw, 320px"
                        className="object-cover"
                      />
                    </a>
                  )
                )}
              </div>
            ) : null}
            {post.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <Badge key={tag.slug} variant="secondary" className="text-xs">
                    #{tag.display}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RestrictionBadge({
  label,
  restriction,
}: {
  label: string
  restriction: ReportRestrictionRef
}) {
  const endsAt = restriction.ends_at
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-help border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {label}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-auto max-w-xs space-y-1 text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">
          {endsAt
            ? `Cấm đến: ${formatDateTime(endsAt)}`
            : "Cấm vĩnh viễn (chưa đặt hạn)"}
        </p>
        {restriction.starts_at ? (
          <p className="text-muted-foreground">
            Bắt đầu: {formatDateTime(restriction.starts_at)}
          </p>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}

function ReportActionsSelect({
  report,
  disabled,
  onPick,
  align = "end",
  className,
}: {
  report: ModerationReport
  disabled: boolean
  onPick: (value: string, report: ModerationReport) => void
  align?: "start" | "end"
  className?: string
}) {
  const options = getActionOptions(report)

  if (report.status === "rejected") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Đã đóng — từ chối
      </Badge>
    )
  }

  if (options.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Không còn thao tác
      </Badge>
    )
  }

  return (
    <Select
      value=""
      disabled={disabled}
      onValueChange={(value) => onPick(value, report)}
    >
      <SelectTrigger
        className={cn("h-9 w-44 data-[size=default]:h-9", className)}
      >
        <SelectValue placeholder="Chọn thao tác" />
      </SelectTrigger>
      <SelectContent align={align}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ReportActionsBadges({
  report,
  align = "start",
}: {
  report: ModerationReport
  align?: "start" | "end"
}) {
  const postRestriction = asRestrictionRef(report.post_create_restriction_id)
  const workerRestriction = asRestrictionRef(
    report.worker_activity_restriction_id
  )
  const hasAny =
    Boolean(report.post_deleted_at) ||
    isRestrictionActive(postRestriction) ||
    isRestrictionActive(workerRestriction)

  if (!hasAny) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      {report.post_deleted_at ? (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Đã xóa bài
        </Badge>
      ) : null}
      {isRestrictionActive(postRestriction) && postRestriction ? (
        <RestrictionBadge
          label="Đã cấm đăng bài"
          restriction={postRestriction}
        />
      ) : null}
      {isRestrictionActive(workerRestriction) && workerRestriction ? (
        <RestrictionBadge
          label="Đã cấm hoạt động worker"
          restriction={workerRestriction}
        />
      ) : null}
    </div>
  )
}

export default function AdminReportsPage() {
  const [targetType, setTargetType] = useState<ReportTargetType | "">("")
  const [status, setStatus] = useState<ReportStatus | "">("open")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [statusDialog, setStatusDialog] = useState<StatusDialogState | null>(
    null
  )
  const [adminNote, setAdminNote] = useState("")

  const [restrictionDialog, setRestrictionDialog] =
    useState<RestrictionDialogState | null>(null)
  const [restrictionReason, setRestrictionReason] = useState("")
  const [banDate, setBanDate] = useState<Date | undefined>(undefined)
  const [banTime, setBanTime] = useState("23:59")

  const [revokeDialog, setRevokeDialog] = useState<RevokeDialogState | null>(
    null
  )

  const [deleteDialog, setDeleteDialog] = useState<DeletePostDialogState | null>(
    null
  )

  const [previewPostId, setPreviewPostId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const reportsQuery = useAdminReports({
    page: 1,
    limit: 20,
    target_type: targetType || undefined,
    status: status || undefined,
    start_date: toStartOfDayISO(startDate),
    end_date: toEndOfDayISO(endDate),
  })
  const updateStatusMutation = useUpdateReportStatus()
  const restrictionMutation = useCreateRestriction()
  const revokeMutation = useRevokeRestriction()
  const deletePostMutation = useAdminDeletePost()
  const reports = reportsQuery.data?.data ?? []

  const isMutating = useMemo(
    () =>
      updateStatusMutation.isPending ||
      restrictionMutation.isPending ||
      revokeMutation.isPending ||
      deletePostMutation.isPending,
    [
      updateStatusMutation.isPending,
      restrictionMutation.isPending,
      revokeMutation.isPending,
      deletePostMutation.isPending,
    ]
  )

  const openPostPreview = (postId: string) => {
    setPreviewPostId(postId)
    setPreviewOpen(true)
  }

  const handlePickAction = (value: string, report: ModerationReport) => {
    const id = report.id ?? report._id ?? ""
    const targetUserId = getObjectId(report.target_user_id)
    const postId = getObjectId(report.post_id)
    const targetLabel = getDisplayName(report.target_user_id)

    if (value.startsWith("status:")) {
      const next = value.slice("status:".length) as ReportStatus
      setAdminNote("")
      setStatusDialog({ id, status: next })
      return
    }

    if (value === "delete_post" && postId) {
      setDeleteDialog({ reportId: id, postId })
      return
    }

    if (value.startsWith("restrict:") && targetUserId) {
      const feature = value.slice("restrict:".length) as RestrictionFeature
      setRestrictionReason("")
      setBanDate(undefined)
      setBanTime("23:59")
      setRestrictionDialog({
        reportId: id,
        userId: targetUserId,
        feature,
        targetLabel,
      })
      return
    }

    if (value.startsWith("revoke:")) {
      const feature = value.slice("revoke:".length) as RestrictionFeature
      const ref = asRestrictionRef(
        feature === "post_create"
          ? report.post_create_restriction_id
          : report.worker_activity_restriction_id
      )
      const restrictionId = ref?._id ?? ref?.id ?? null
      if (!restrictionId) return
      setRevokeDialog({ restrictionId, feature, targetLabel })
    }
  }

  const confirmUpdateReportStatus = () => {
    if (!statusDialog) return
    const dialog = statusDialog
    updateStatusMutation.mutate(
      {
        id: dialog.id,
        status: dialog.status,
        admin_note: adminNote.trim() || null,
      },
      {
        onSuccess: () => {
          setStatusDialog(null)
          setAdminNote("")

          if (dialog.status !== "resolved") return

          const report = reports.find((r) => (r.id ?? r._id) === dialog.id)
          if (!report) return

          const targetUserId = getObjectId(report.target_user_id)
          if (!targetUserId) return
          const targetLabel = getDisplayName(report.target_user_id)

          const feature: RestrictionFeature | null =
            report.target_type === "worker"
              ? "worker_activity"
              : report.target_type === "post"
                ? "post_create"
                : null
          if (!feature) return

          const ref = asRestrictionRef(
            feature === "worker_activity"
              ? report.worker_activity_restriction_id
              : report.post_create_restriction_id
          )
          if (isRestrictionActive(ref)) return

          setRestrictionReason("")
          setBanDate(undefined)
          setBanTime("23:59")
          setRestrictionDialog({
            reportId: dialog.id,
            userId: targetUserId,
            feature,
            targetLabel,
            autoChained: true,
          })
        },
      }
    )
  }

  const confirmRestriction = () => {
    if (!restrictionDialog) return
    const reason =
      restrictionReason.trim() ||
      (restrictionDialog.feature === "post_create"
        ? "Cấm đăng bài từ dashboard báo cáo"
        : "Cấm hoạt động worker từ dashboard báo cáo")

    let endsAt: string | null = null
    if (banDate) {
      const [hours, minutes] = (banTime || "23:59").split(":").map(Number)
      const combined = new Date(banDate)
      combined.setHours(hours ?? 23, minutes ?? 59, 0, 0)
      endsAt = combined.toISOString()
    }

    restrictionMutation.mutate(
      {
        user_id: restrictionDialog.userId,
        feature: restrictionDialog.feature,
        reason,
        ends_at: endsAt,
        report_id: restrictionDialog.reportId,
      },
      {
        onSuccess: () => {
          setRestrictionDialog(null)
          setRestrictionReason("")
          setBanDate(undefined)
          setBanTime("23:59")
        },
      }
    )
  }

  const confirmRevoke = () => {
    if (!revokeDialog) return
    revokeMutation.mutate(revokeDialog.restrictionId, {
      onSuccess: () => setRevokeDialog(null),
    })
  }

  const confirmDeletePost = () => {
    if (!deleteDialog) return
    deletePostMutation.mutate(
      { postId: deleteDialog.postId, reportId: deleteDialog.reportId },
      { onSuccess: () => setDeleteDialog(null) }
    )
  }

  const clearFilters = () => {
    setTargetType("")
    setStatus("open")
    setStartDate("")
    setEndDate("")
  }

  const hasFilters =
    Boolean(targetType || startDate || endDate) || status !== "open"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý báo cáo</h1>
        <p className="text-sm text-muted-foreground">
          Xử lý báo cáo bài viết và worker.
        </p>
      </div>

      <Card className="border-muted/70 shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              Bộ lọc
            </CardTitle>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw className="size-4" />
                Xóa lọc
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Loại báo cáo
              </Label>
              <Select
                value={targetType || ALL}
                onValueChange={(value) =>
                  setTargetType(value === ALL ? "" : (value as ReportTargetType))
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {targetTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Trạng thái</Label>
              <Select
                value={status || ALL}
                onValueChange={(value) =>
                  setStatus(value === ALL ? "" : (value as ReportStatus))
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {reportStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Khoảng ngày báo cáo
              </Label>
              <DateRangePicker
                value={{
                  from: parseFilterDate(startDate),
                  to: parseFilterDate(endDate),
                }}
                onChange={(range) => {
                  setStartDate(formatFilterDate(range?.from))
                  setEndDate(formatFilterDate(range?.to))
                }}
                buttonClassName="h-9 w-full data-[size=default]:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden md:hidden">
        <div className="divide-y">
          {reportsQuery.isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Không có báo cáo phù hợp.
            </div>
          ) : (
            reports.map((report) => {
              const id = report.id ?? report._id ?? ""
              const targetUserId = getObjectId(report.target_user_id)
              const targetWorkerSummary = getWorkerProfileSummary(
                report.target_user_id
              )
              const postId = getObjectId(report.post_id)
              return (
                <div key={id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">
                      {getTargetTypeLabel(report.target_type)}
                    </Badge>
                    <Badge variant={statusBadgeVariant[report.status]}>
                      {getReportStatusLabel(report.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Người báo cáo:{" "}
                      </span>
                      <span className="font-medium">
                        {getDisplayName(report.reporter_id)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày tạo: </span>
                      <span>{formatDateTime(report.created_at)}</span>
                    </div>
                    {report.target_type === "post" && postId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Bài viết:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 px-2"
                          onClick={() => openPostPreview(postId)}
                        >
                          <Eye className="size-3.5" />
                          Xem
                        </Button>
                      </div>
                    ) : null}
                    <div>
                      <span className="text-muted-foreground">Đối tượng: </span>
                      {report.target_type === "worker" && targetUserId ? (
                        <span className="inline-block">
                          <Link
                            href={`/worker/${targetUserId}`}
                            className="break-words font-medium text-primary hover:underline"
                          >
                            {getDisplayName(report.target_user_id)}
                          </Link>
                          {targetWorkerSummary ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {targetWorkerSummary}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="break-words font-medium">
                          {getPostPreview(report.post_id)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lý do: </span>
                      <span>{getReportReasonLabel(report.reason)}</span>
                    </div>
                    {report.description ? (
                      <div className="text-xs text-muted-foreground">
                        {report.description}
                      </div>
                    ) : null}
                    {report.evidence_urls?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {report.evidence_urls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-md border"
                          >
                            <Image
                              src={url}
                              alt="Ảnh minh chứng báo cáo"
                              width={64}
                              height={64}
                              className="size-16 object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {report.admin_note ? (
                      <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                        <span className="font-medium">Ghi chú admin: </span>
                        {report.admin_note}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Đã xử lý
                      </p>
                      <ReportActionsBadges report={report} />
                    </div>
                    <ReportActionsSelect
                      report={report}
                      disabled={isMutating}
                      onPick={handlePickAction}
                      align="start"
                      className="w-full"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Loại</th>
                <th className="px-4 py-3 text-left">Người báo cáo</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Bài viết</th>
                <th className="px-4 py-3 text-left">Đối tượng</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Đã xử lý</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reportsQuery.isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Không có báo cáo phù hợp.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const id = report.id ?? report._id ?? ""
                  const targetUserId = getObjectId(report.target_user_id)
                  const targetWorkerSummary = getWorkerProfileSummary(
                    report.target_user_id
                  )
                  const postId = getObjectId(report.post_id)
                  return (
                    <tr key={id} className="border-b align-top last:border-b-0">
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {getTargetTypeLabel(report.target_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {getDisplayName(report.reporter_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDateTime(report.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {report.target_type === "post" && postId ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Xem chi tiết bài viết"
                            onClick={() => openPostPreview(postId)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {report.target_type === "worker" && targetUserId ? (
                          <div className="space-y-1">
                            <Link
                              href={`/worker/${targetUserId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {getDisplayName(report.target_user_id)}
                            </Link>
                            {targetWorkerSummary ? (
                              <p className="max-w-56 text-xs text-muted-foreground">
                                {targetWorkerSummary}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="line-clamp-2 max-w-56 text-sm">
                            {getPostPreview(report.post_id)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getReportReasonLabel(report.reason)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          {report.description ? <p>{report.description}</p> : null}
                          {report.evidence_urls?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {report.evidence_urls.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-md border"
                                >
                                  <Image
                                    src={url}
                                    alt="Ảnh minh chứng báo cáo"
                                    width={56}
                                    height={56}
                                    className="size-14 object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {report.admin_note ? (
                            <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs text-foreground">
                              <span className="font-medium">
                                Ghi chú admin:{" "}
                              </span>
                              {report.admin_note}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[report.status]}>
                          {getReportStatusLabel(report.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ReportActionsBadges report={report} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <ReportActionsSelect
                            report={report}
                            disabled={isMutating}
                            onPick={handlePickAction}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <PostPreviewDialog
        postId={previewPostId}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewPostId(null)
        }}
      />

      <Dialog
        open={Boolean(statusDialog)}
        onOpenChange={(open) => {
          if (!open && !updateStatusMutation.isPending) {
            setStatusDialog(null)
            setAdminNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái báo cáo</DialogTitle>
            <DialogDescription>
              {statusDialog?.status === "resolved"
                ? "Sau khi xác nhận, bạn có thể tiếp tục xóa bài hoặc cấm đăng bài/cấm worker."
                : statusDialog?.status === "rejected"
                  ? "Báo cáo sẽ được đóng và không cần xử lý thêm."
                  : "Đánh dấu báo cáo đang được xem xét."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Trạng thái mới:{" "}
              <span className="font-medium">
                {statusDialog ? getReportStatusLabel(statusDialog.status) : "-"}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-note">Ghi chú admin</Label>
              <Textarea
                id="admin-note"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Nhập ghi chú xử lý báo cáo..."
                className="min-h-28"
                disabled={updateStatusMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                setStatusDialog(null)
                setAdminNote("")
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={updateStatusMutation.isPending}
              onClick={confirmUpdateReportStatus}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(restrictionDialog)}
        onOpenChange={(open) => {
          if (!open && !restrictionMutation.isPending) {
            setRestrictionDialog(null)
            setRestrictionReason("")
            setBanDate(undefined)
            setBanTime("23:59")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {restrictionDialog?.feature === "post_create"
                ? "Cấm đăng bài"
                : "Cấm hoạt động worker"}
            </DialogTitle>
            <DialogDescription>
              Đối tượng:{" "}
              <span className="font-medium">
                {restrictionDialog?.targetLabel}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {restrictionDialog?.autoChained ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                Báo cáo vừa được đánh dấu đã xử lý. Chọn chế tài bên dưới, hoặc bấm Hủy nếu không cần áp dụng cấm.
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="restriction-reason">Lý do</Label>
              <Textarea
                id="restriction-reason"
                value={restrictionReason}
                onChange={(event) => setRestrictionReason(event.target.value)}
                placeholder="Ghi rõ lý do cấm (tùy chọn)..."
                className="min-h-24"
                disabled={restrictionMutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Cấm đến lúc (để trống = vĩnh viễn)
              </Label>
              <div className="flex gap-2">
                <DatePicker
                  value={banDate}
                  onChange={setBanDate}
                  fromDate={new Date()}
                  placeholder="Chọn ngày"
                  captionLayout="dropdown"
                  buttonClassName="h-9 flex-1"
                />
                <Input
                  type="time"
                  className="h-9 w-[7.5rem] shrink-0"
                  value={banTime}
                  onChange={(event) => setBanTime(event.target.value)}
                  disabled={!banDate}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restrictionMutation.isPending}
              onClick={() => {
                setRestrictionDialog(null)
                setRestrictionReason("")
                setBanDate(undefined)
                setBanTime("23:59")
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={restrictionMutation.isPending}
              onClick={confirmRestriction}
            >
              {restrictionMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Xác nhận cấm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeDialog)}
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) setRevokeDialog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {revokeDialog?.feature === "post_create"
                ? "Gỡ cấm đăng bài"
                : "Gỡ cấm hoạt động worker"}
            </DialogTitle>
            <DialogDescription>
              Đối tượng:{" "}
              <span className="font-medium">{revokeDialog?.targetLabel}</span>.
              Người dùng sẽ có thể tiếp tục hoạt động ngay sau khi gỡ cấm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={revokeMutation.isPending}
              onClick={() => setRevokeDialog(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={revokeMutation.isPending}
              onClick={confirmRevoke}
            >
              {revokeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Xác nhận gỡ cấm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => {
          if (!open && !deletePostMutation.isPending) setDeleteDialog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa bài viết</DialogTitle>
            <DialogDescription>
              Bài viết sẽ bị xóa khỏi bảng tin. Hành động sẽ được ghi vào báo cáo
              này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletePostMutation.isPending}
              onClick={() => setDeleteDialog(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePostMutation.isPending}
              onClick={confirmDeletePost}
            >
              {deletePostMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Xóa bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
