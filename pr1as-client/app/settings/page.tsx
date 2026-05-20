"use client"

import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import {
  Ban,
  CheckCircle2,
  Eye,
  FileWarning,
  Loader2,
  ShieldCheck,
  Star,
  UserX,
} from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import {
  useBlockedUsers,
  useMyReports,
  useUnblockUser,
} from "@/lib/hooks/use-moderation"
import { useReputationHistory } from "@/lib/hooks/use-reputation"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
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

type SettingsSection =
  | "blocked"
  | "post-reports"
  | "worker-reports"
  | "reputation"

const sections: Array<{
  id: SettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: "blocked", label: "Danh sách chặn", icon: Ban },
  { id: "post-reports", label: "Bài viết đã báo cáo", icon: FileWarning },
  { id: "worker-reports", label: "Worker đã báo cáo", icon: UserX },
  { id: "reputation", label: "Điểm uy tín", icon: Star },
]

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

function LoadingPanel() {
  return (
    <div className="flex min-h-52 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function SectionContent({ section }: { section: SettingsSection }) {
  if (section === "blocked") return <BlockedList />
  if (section === "post-reports") return <ReportsList targetType="post" />
  if (section === "worker-reports") return <ReportsList targetType="worker" />
  return <ReputationPanel />
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    React.useState<SettingsSection>("blocked")
  const active =
    sections.find((item) => item.id === activeSection) ?? sections[0]

  return (
    <div className="container mx-auto px-4 py-4 lg:py-24">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
        <aside className="-mx-4 overflow-hidden border-y bg-background px-4 py-2 lg:sticky lg:top-20 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0">
          <Card
            className="flex gap-2 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-md lg:border lg:bg-card lg:p-2 lg:shadow-sm [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Settings sections"
          >
            {sections.map((item) => {
              const Icon = item.icon
              const isActive = item.id === activeSection
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2.5 rounded-md px-3 text-left text-sm font-medium whitespace-nowrap transition lg:w-full lg:justify-start",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </Card>
        </aside>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{active.label}</h2>
              <p className="text-sm text-muted-foreground">
                {activeSection === "blocked"
                  ? "Xem và bỏ chặn những người dùng bạn đã chặn."
                  : activeSection === "post-reports"
                    ? "Theo dõi trạng thái và kết quả xử lý các bài viết bạn đã báo cáo."
                    : activeSection === "worker-reports"
                      ? "Theo dõi trạng thái và kết quả xử lý các worker bạn đã báo cáo."
                      : "Xem điểm hiện tại và lịch sử cộng trừ điểm của bạn."}
              </p>
            </div>
            <CheckCircle2 className="hidden size-5 text-muted-foreground sm:block" />
          </div>
          <Separator className="my-5" />
          <SectionContent section={activeSection} />
        </Card>
      </div>
    </div>
  )
}
