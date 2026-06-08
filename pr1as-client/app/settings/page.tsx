"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Ban,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileWarning,
  Lightbulb,
  Loader2,
  Lock,
  Mail,
  MessageSquarePlus,
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

const sectionMeta: Record<
  SettingsSection,
  {
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    danger?: boolean
  }
> = {
  blocked: {
    label: "Danh sách chặn",
    description: "Xem và bỏ chặn những người dùng bạn đã chặn.",
    icon: Ban,
  },
  "post-reports": {
    label: "Bài viết đã báo cáo",
    description:
      "Theo dõi trạng thái và kết quả xử lý các bài viết bạn đã báo cáo.",
    icon: FileWarning,
  },
  "worker-reports": {
    label: "Worker đã báo cáo",
    description:
      "Theo dõi trạng thái và kết quả xử lý các worker bạn đã báo cáo.",
    icon: UserX,
  },
  reputation: {
    label: "Điểm uy tín",
    description: "Xem điểm hiện tại và lịch sử cộng trừ điểm của bạn.",
    icon: Star,
  },
  feedback: {
    label: "Gửi phản hồi",
    description: "Gửi báo lỗi hoặc đề xuất tính năng tới đội ngũ quản trị.",
    icon: MessageSquarePlus,
  },
  "delete-account": {
    label: "Xoá tài khoản",
    description: "Yêu cầu xoá vĩnh viễn tài khoản của bạn.",
    icon: Trash2,
    danger: true,
  },
}

const sectionGroups: Array<{ title: string; items: SettingsSection[] }> = [
  {
    title: "An toàn & kiểm duyệt",
    items: ["blocked", "post-reports", "worker-reports"],
  },
  { title: "Tài khoản", items: ["reputation", "feedback"] },
  { title: "Vùng nguy hiểm", items: ["delete-account"] },
]

// Các hàng điều hướng tới trang riêng (không phải panel trong settings).
const navLinks: Array<{
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    href: "/client/profile",
    label: "Thông tin cá nhân",
    description: "Họ tên, email, ảnh đại diện, gói thành viên.",
    icon: User,
  },
]

// Trang thông tin, pháp lý và liên hệ — trước đây nằm ở footer (đã ẩn trên mobile).
const infoLinks: Array<{
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  external?: boolean
}> = [
  {
    href: "/privacy",
    label: "Chính sách bảo mật",
    description: "Cách chúng tôi thu thập và bảo vệ dữ liệu của bạn.",
    icon: Lock,
  },
  {
    href: "/terms",
    label: "Điều khoản sử dụng",
    description: "Quy định khi sử dụng nền tảng PR1AS.",
    icon: FileText,
  },
  {
    href: `mailto:${siteConfig.contactEmail}`,
    label: "Liên hệ",
    description: siteConfig.contactEmail,
    icon: Mail,
    external: true,
  },
]

const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  open: "Đã gửi",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
  rejected: "Đã từ chối",
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

const feedbackTypeLabels: Record<FeedbackType, string> = {
  bug: "Báo lỗi",
  feature: "Đề xuất tính năng",
}

const statusLabels: Record<ReportStatus, string> = {
  open: "Đang mở",
  reviewing: "Đang xem xét",
  resolved: "Đã xử lý",
  rejected: "Đã từ chối",
}

const reasonLabels: Record<ReportReason, string> = {
  scam: "Lừa đảo",
  low_quality: "Chất lượng thấp",
  harassment: "Quấy rối",
  fake_profile: "Hồ sơ giả mạo",
  other: "Khác",
}

const reputationReasonLabels: Record<ReputationHistoryReason, string> = {
  booking_expiry: "Trừ điểm do booking hết hạn",
  worker_cancel: "Trừ điểm do worker hủy booking",
  low_review: "Trừ điểm do đánh giá thấp",
  daily_recovery: "Cộng điểm phục hồi hằng ngày",
  manual: "Điều chỉnh thủ công",
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

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function getBlockedUser(block: UserBlock) {
  const blocked = block.blocked_id
  if (typeof blocked === "object" && blocked) {
    const id = blocked._id ?? blocked.id
    return {
      id,
      name: blocked.full_name || blocked.email || id || "Người dùng",
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

function getPostPreview(value: unknown) {
  if (!value || typeof value !== "object") return "Bài viết"
  const post = value as {
    body?: string | null
    deleted?: boolean
    deleted_at?: string | null
  }
  if (post.deleted || post.deleted_at) return "Bài viết đã bị xóa"
  const body = post.body?.trim()
  return body
    ? body.length > 96
      ? `${body.slice(0, 96)}...`
      : body
    : "Bài viết"
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
  const hasRestriction =
    Boolean(report.post_create_restriction_id) ||
    Boolean(report.worker_activity_restriction_id)
  if (report.post_deleted_at) {
    return <Badge variant="outline">Bài viết đã bị xóa</Badge>
  }
  if (hasRestriction) {
    return <Badge variant="outline">Đã áp dụng hạn chế</Badge>
  }
  if (report.status === "resolved") {
    return (
      <Badge variant="outline">Đã xử lý, chưa có hành động công khai</Badge>
    )
  }
  if (report.status === "rejected") {
    return <Badge variant="destructive">Không vi phạm</Badge>
  }
  return <Badge variant="secondary">Chưa có kết quả</Badge>
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
  const blocksQuery = useBlockedUsers()
  const unblockMutation = useUnblockUser()
  const blocks = blocksQuery.data ?? []

  if (blocksQuery.isLoading) return <LoadingPanel />
  if (blocks.length === 0) {
    return <EmptyState icon={Ban} title="Bạn chưa chặn người dùng nào." />
  }

  return (
    <div className="divide-y">
      {blocks.map((block) => {
        const user = getBlockedUser(block)
        return (
          <div
            key={block.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email || "Không có email"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {block.block_profile
                  ? "Đang chặn profile và bài viết"
                  : "Chỉ chặn chat"}
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
                  Bỏ chặn
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bỏ chặn người dùng?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn sẽ có thể nhắn tin và xem lại nội dung của {user.name}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:space-x-0">
                  <AlertDialogCancel className="mt-0">Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={unblockMutation.isPending || !user.id}
                    onClick={() => {
                      if (!user.id) return
                      unblockMutation.mutate(user.id)
                    }}
                  >
                    Xác nhận bỏ chặn
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
  const post = getReportedPost(report?.post_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bài viết</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted/30 p-4">
            {post.body ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {post.body}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Không có nội dung bài viết trong lịch sử báo cáo.
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
                      alt="Hình ảnh bài viết"
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
            ? "Bạn chưa báo cáo bài viết nào."
            : "Bạn chưa báo cáo worker nào."
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
                      {statusLabels[report.status]}
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
                      getPostPreview(report.post_id)
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lý do: {reasonLabels[report.reason]} ·{" "}
                    {formatDateTime(report.created_at)}
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
                      Xem bài viết
                    </Button>
                  ) : null}
                  {report.admin_note ? (
                    <div className="max-w-sm rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">Phản hồi: </span>
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
  const user = useAuthStore((state) => state.user)
  const score = getReputationScore(user?.meta_data?.reputation_score)
  const historyQuery = useReputationHistory({ page: 1, limit: 30 })
  const histories = historyQuery.data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-background p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Điểm hiện tại</p>
            <p className="text-3xl font-semibold tracking-tight">{score}/100</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              getReputationBadgeClass(score)
            )}
          >
            {score < 30 ? "Cần cải thiện" : score < 70 ? "Ổn định" : "Tốt"}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${score}%` }} />
        </div>
      </div>

      {historyQuery.isLoading ? (
        <LoadingPanel />
      ) : histories.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Chưa có lịch sử cộng hoặc trừ điểm."
        />
      ) : (
        <div className="divide-y rounded-md border bg-background">
          {histories.map((item: ReputationHistory) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {reputationReasonLabels[item.reason]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.previous_score} → {item.new_score} ·{" "}
                  {formatDateTime(item.created_at)}
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
          <Label htmlFor="feedback-type">Loại phản hồi</Label>
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
                Báo lỗi (bug)
              </SelectItem>
              <SelectItem value="feature">
                <Lightbulb className="size-4" />
                Đề xuất tính năng
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-title">Tiêu đề</Label>
          <Input
            id="feedback-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === "bug"
                ? "Tóm tắt ngắn gọn lỗi bạn gặp phải"
                : "Tóm tắt ngắn gọn tính năng bạn đề xuất"
            }
            maxLength={200}
            disabled={createMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-description">Mô tả chi tiết</Label>
          <Textarea
            id="feedback-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              type === "bug"
                ? "Mô tả các bước tái hiện lỗi, thiết bị/trình duyệt bạn dùng, kết quả mong đợi..."
                : "Mô tả tính năng bạn mong muốn và lý do nó hữu ích..."
            }
            maxLength={5000}
            className="min-h-32"
            disabled={createMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">Tối thiểu 10 ký tự.</p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Gửi phản hồi
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Phản hồi đã gửi</h3>
        {feedbackQuery.isLoading ? (
          <LoadingPanel />
        ) : feedbacks.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title="Bạn chưa gửi phản hồi nào."
          />
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
                      {feedbackTypeLabels[feedback.type]}
                    </Badge>
                    <Badge variant={feedbackStatusVariants[feedback.status]}>
                      {feedbackStatusLabels[feedback.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(feedback.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{feedback.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                    {feedback.description}
                  </p>
                  {feedback.admin_note ? (
                    <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">Phản hồi từ admin: </span>
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

function blockerMessage(blocker: AccountDeleteBlocker): string {
  switch (blocker.code) {
    case "WALLET_BALANCE":
      return `Số dư ví còn ${formatVND(blocker.detail)}. Vui lòng rút hết trước khi xoá.`
    case "ACTIVE_BOOKINGS":
      return `Bạn đang có ${blocker.detail} booking chưa kết thúc.`
    case "OPEN_DISPUTES":
      return `Bạn đang có ${blocker.detail} khiếu nại chưa được xử lý.`
  }
}

function DeleteAccountPanel() {
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
      toast.error("Không tìm thấy email tài khoản.")
      return
    }
    try {
      const response = await forgotPasswordMutation.mutateAsync({
        email: user.email,
      })
      if (response.success) {
        toast.success(
          "Đã gửi email đặt mật khẩu. Sau khi đặt xong, quay lại để xoá tài khoản."
        )
      } else {
        toast.error(
          getErrorMessage(response.error, "Không thể gửi email đặt mật khẩu.")
        )
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi email đặt mật khẩu."))
    }
  }

  const handleSubmit = async () => {
    setSubmitBlockers([])
    try {
      await deleteMutation.mutateAsync({ password })
      toast.success(
        "Đã yêu cầu xoá tài khoản. Đăng nhập lại trong 30 ngày để huỷ thao tác."
      )
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
      toast.error(getErrorMessage(error, "Không thể xoá tài khoản."))
    }
  }

  if (statusQuery.isLoading) return <LoadingPanel />

  if (statusQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Không thể tải trạng thái</AlertTitle>
        <AlertDescription>
          {getErrorMessage(statusQuery.error, "Vui lòng thử lại sau.")}
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
        <AlertTitle>Hành động này có thời gian khôi phục 30 ngày</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Sau khi xoá, tài khoản sẽ bị khoá ngay lập tức. Trong vòng 30 ngày,
            đăng nhập lại bằng email và mật khẩu hiện tại để khôi phục.
          </p>
          <p>
            Sau 30 ngày, thông tin cá nhân (tên, ảnh đại diện, số điện thoại, hồ
            sơ) sẽ bị xoá vĩnh viễn. Bài viết và bình luận của bạn sẽ bị ẩn khỏi
            cộng đồng. Lịch sử booking, đánh giá và ví được giữ lại theo quy
            định để phục vụ đối chiếu.
          </p>
        </AlertDescription>
      </Alert>

      <div className="rounded-md border bg-background p-4">
        <h3 className="font-medium">Trước khi xoá, vui lòng đảm bảo:</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>Số dư ví đã được rút về tài khoản ngân hàng.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              Không còn booking nào đang chờ xác nhận hoặc đang thực hiện.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>Không còn khiếu nại nào chưa được xử lý.</span>
          </li>
        </ul>
      </div>

      {blockers.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Chưa thể xoá tài khoản</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blockers.map((blocker) => (
                <li key={blocker.code}>{blockerMessage(blocker)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {status && !status.has_password ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Cần đặt mật khẩu trước khi xoá</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Tài khoản của bạn đang đăng nhập bằng Google nên chưa có mật khẩu.
              Vui lòng đặt mật khẩu để xác nhận quyền sở hữu trước khi xoá.
            </p>
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
              Gửi email đặt mật khẩu
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
            Xoá tài khoản của tôi
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xoá tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Nhập mật khẩu hiện tại để xác nhận. Bạn sẽ bị đăng xuất khỏi mọi
              thiết bị ngay sau khi xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-account-password">Mật khẩu hiện tại</Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={deleteMutation.isPending}
              placeholder="Nhập mật khẩu để xác nhận"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel
              className="mt-0"
              disabled={deleteMutation.isPending}
            >
              Huỷ
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
              Xác nhận xoá
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
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>
      </div>

      <div className="lg:grid lg:grid-cols-[19rem_1fr] lg:gap-6">
        {/* DANH SÁCH MỤC — list trên mobile, sidebar trên desktop */}
        <aside className={cn(activeSection !== null && "max-lg:hidden")}>
          <nav className="space-y-6 lg:sticky lg:top-20 lg:space-y-5">
            <div className="lg:hidden">
              <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-1">
                Hồ sơ
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
                          {link.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground lg:hidden">
                          {link.description}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                    </Link>
                  )
                })}
              </div>
            </div>
            {sectionGroups.map((group) => (
              <div key={group.title}>
                <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-1">
                  {group.title}
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
                            {meta.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground lg:hidden">
                            {meta.description}
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
                Thông tin & pháp lý
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
                          {link.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground lg:hidden">
                          {link.description}
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
              aria-label="Quay lại"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="truncate text-base font-semibold tracking-tight">
              {activeMeta.label}
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
                  <h2 className="text-lg font-semibold">{activeMeta.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeMeta.description}
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
