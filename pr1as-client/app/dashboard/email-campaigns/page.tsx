"use client"

import { useState } from "react"
import {
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MailCheck,
  MailWarning,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"
import { Table } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  useEmailCampaigns,
  useEmailCampaignLogs,
  useCreateEmailCampaign,
  useUpdateEmailCampaign,
  useDeleteEmailCampaign,
  useSendEmailCampaign,
  useCancelEmailCampaign,
} from "@/lib/hooks/use-email-campaign"
import type {
  EmailCampaign,
  EmailCampaignAudience,
  EmailCampaignStatus,
  EmailSendLog,
  EmailSendLogStatus,
  CreateCampaignInput,
} from "@/services/email-campaign.service"

const ALL = "all"

const audienceOptions: Array<{ value: EmailCampaignAudience; label: string }> =
  [
    { value: "all", label: "Tất cả người dùng" },
    { value: "clients", label: "Khách hàng" },
    { value: "workers", label: "Nhân viên" },
  ]

const statusOptions: Array<{ value: EmailCampaignStatus; label: string }> = [
  { value: "draft", label: "Bản nháp" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "sending", label: "Đang gửi" },
  { value: "sent", label: "Đã gửi" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" },
]

const statusBadge: Record<
  EmailCampaignStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft: { variant: "secondary", icon: <PenLine className="size-3" /> },
  scheduled: { variant: "default", icon: <Clock className="size-3" /> },
  sending: { variant: "default", icon: <Loader2 className="size-3 animate-spin" /> },
  sent: { variant: "outline", icon: <MailCheck className="size-3" /> },
  failed: { variant: "destructive", icon: <MailWarning className="size-3" /> },
  cancelled: { variant: "secondary", icon: <XCircle className="size-3" /> },
}

const logStatusBadge: Record<
  EmailSendLogStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "secondary", label: "Đang chờ" },
  sent: { variant: "outline", label: "Đã gửi" },
  failed: { variant: "destructive", label: "Thất bại" },
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function getCreatorName(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const u = value as { full_name?: string | null; email?: string }
  return u.full_name || u.email || "-"
}

function successRate(campaign: EmailCampaign): string {
  if (campaign.total_recipients === 0) return "-"
  const rate = Math.round((campaign.sent_count / campaign.total_recipients) * 100)
  return `${rate}%`
}

type FormState = {
  name: string
  subject: string
  html_content: string
  audience: EmailCampaignAudience
  scheduled_at: string
}

const defaultForm: FormState = {
  name: "",
  subject: "",
  html_content: "",
  audience: "all",
  scheduled_at: "",
}

function CampaignForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial?: FormState
  onSubmit: (data: CreateCampaignInput) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial ?? defaultForm)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    onSubmit({
      name: form.name.trim(),
      subject: form.subject.trim(),
      html_content: form.html_content.trim(),
      audience: form.audience,
      scheduled_at: form.scheduled_at ? form.scheduled_at : null,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ec-name">Tên chiến dịch</Label>
        <Input
          id="ec-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ví dụ: Newsletter tháng 6"
          disabled={isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-subject">Tiêu đề email</Label>
        <Input
          id="ec-subject"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="Tiêu đề hiển thị trong hộp thư"
          disabled={isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-audience">Đối tượng</Label>
        <Select
          value={form.audience}
          onValueChange={(v) => set("audience", v as EmailCampaignAudience)}
          disabled={isPending}
        >
          <SelectTrigger id="ec-audience" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-scheduled">Lên lịch gửi (tùy chọn)</Label>
        <Input
          id="ec-scheduled"
          type="datetime-local"
          value={form.scheduled_at}
          onChange={(e) => set("scheduled_at", e.target.value)}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Để trống nếu muốn lưu bản nháp và gửi thủ công.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ec-html">Nội dung email (HTML)</Label>
        <Textarea
          id="ec-html"
          value={form.html_content}
          onChange={(e) => set("html_content", e.target.value)}
          placeholder="<h1>Xin chào!</h1><p>Nội dung email...</p>"
          className="min-h-48 font-mono text-xs"
          disabled={isPending}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isPending ||
            !form.name.trim() ||
            !form.subject.trim() ||
            !form.html_content.trim()
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Lưu
        </Button>
      </DialogFooter>
    </div>
  )
}

function SendLogsDrawer({
  campaign,
  onClose,
}: {
  campaign: EmailCampaign
  onClose: () => void
}) {
  const [logStatus, setLogStatus] = useState<EmailSendLogStatus | "">("")
  const [page, setPage] = useState(1)
  const logsQuery = useEmailCampaignLogs(campaign.id ?? campaign._id ?? "", {
    page,
    limit: 30,
    status: logStatus || undefined,
  })
  const logs = logsQuery.data?.data ?? []
  const pagination = logsQuery.data?.pagination

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Log gửi email</h2>
          <p className="text-sm text-muted-foreground">{campaign.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-2xl font-bold">{campaign.total_recipients}</p>
          <p className="text-xs text-muted-foreground">Tổng người nhận</p>
        </div>
        <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/30">
          <p className="text-2xl font-bold text-green-600">{campaign.sent_count}</p>
          <p className="text-xs text-muted-foreground">Gửi thành công</p>
        </div>
        <div className="rounded-lg border bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-2xl font-bold text-red-600">{campaign.failed_count}</p>
          <p className="text-xs text-muted-foreground">Thất bại</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={logStatus || ALL}
          onValueChange={(v) => {
            setLogStatus(v === ALL ? "" : (v as EmailSendLogStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả</SelectItem>
            <SelectItem value="pending">Đang chờ</SelectItem>
            <SelectItem value="sent">Đã gửi</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logsQuery.refetch()}
          disabled={logsQuery.isFetching}
        >
          <RefreshCw className={`size-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-lg border">
        <Table>
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left text-xs">Email</th>
              <th className="px-3 py-2 text-left text-xs">Trạng thái</th>
              <th className="px-3 py-2 text-left text-xs">Thời gian gửi</th>
              <th className="px-3 py-2 text-left text-xs">Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {logsQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Không có log phù hợp.
                </td>
              </tr>
            ) : (
              logs.map((log: EmailSendLog) => (
                <tr key={log.id ?? log._id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-sm">{log.recipient_email}</td>
                  <td className="px-3 py-2">
                    <Badge variant={logStatusBadge[log.status].variant} className="gap-1">
                      {log.status === "sent" ? (
                        <CheckCircle className="size-3" />
                      ) : log.status === "failed" ? (
                        <XCircle className="size-3" />
                      ) : null}
                      {logStatusBadge[log.status].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {formatDateTime(log.sent_at)}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-xs text-red-500">
                    {log.error_message ?? "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pagination.page}/{pagination.totalPages} · {pagination.total} bản ghi
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function EmailCampaignsPage() {
  const [filterStatus, setFilterStatus] = useState<EmailCampaignStatus | "">("")
  const [filterAudience, setFilterAudience] = useState<EmailCampaignAudience | "">("")
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EmailCampaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailCampaign | null>(null)
  const [sendTarget, setSendTarget] = useState<EmailCampaign | null>(null)
  const [cancelTarget, setCancelTarget] = useState<EmailCampaign | null>(null)
  const [logTarget, setLogTarget] = useState<EmailCampaign | null>(null)

  const campaignsQuery = useEmailCampaigns({
    page,
    limit: 20,
    status: filterStatus || undefined,
    audience: filterAudience || undefined,
  })
  const campaigns = campaignsQuery.data?.data ?? []
  const pagination = campaignsQuery.data?.pagination

  const createMutation = useCreateEmailCampaign()
  const updateMutation = useUpdateEmailCampaign()
  const deleteMutation = useDeleteEmailCampaign()
  const sendMutation = useSendEmailCampaign()
  const cancelMutation = useCancelEmailCampaign()

  const hasFilters = Boolean(filterStatus) || Boolean(filterAudience)

  const clearFilters = () => {
    setFilterStatus("")
    setFilterAudience("")
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Tạo và gửi chiến dịch email đến người dùng trong hệ thống.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          Tạo chiến dịch
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Tổng chiến dịch",
            value: pagination?.total ?? "-",
            icon: <Mail className="size-5 text-muted-foreground" />,
          },
          {
            label: "Đã gửi",
            value: campaigns.filter((c) => c.status === "sent").length,
            icon: <MailCheck className="size-5 text-green-500" />,
          },
          {
            label: "Đang lên lịch",
            value: campaigns.filter((c) => c.status === "scheduled").length,
            icon: <Clock className="size-5 text-blue-500" />,
          },
          {
            label: "Thất bại",
            value: campaigns.filter((c) => c.status === "failed").length,
            icon: <MailWarning className="size-5 text-red-500" />,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-muted/70 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              {stat.icon}
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Trạng thái</Label>
              <Select
                value={filterStatus || ALL}
                onValueChange={(v) => {
                  setFilterStatus(v === ALL ? "" : (v as EmailCampaignStatus))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Đối tượng</Label>
              <Select
                value={filterAudience || ALL}
                onValueChange={(v) => {
                  setFilterAudience(v === ALL ? "" : (v as EmailCampaignAudience))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {audienceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Tên chiến dịch</th>
                <th className="px-4 py-3 text-left text-sm">Đối tượng</th>
                <th className="px-4 py-3 text-left text-sm">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm">Người tạo</th>
                <th className="px-4 py-3 text-left text-sm">Lên lịch</th>
                <th className="px-4 py-3 text-left text-sm">Gửi lúc</th>
                <th className="px-4 py-3 text-left text-sm">Tỷ lệ thành công</th>
                <th className="px-4 py-3 text-right text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {campaignsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    Chưa có chiến dịch nào.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => {
                  const id = campaign.id ?? campaign._id ?? ""
                  const badge = statusBadge[campaign.status]
                  const canSend =
                    campaign.status === "draft" || campaign.status === "scheduled"
                  const canEdit =
                    campaign.status !== "sending" && campaign.status !== "sent"
                  const canDelete = campaign.status !== "sending"
                  const canCancel = campaign.status === "scheduled"

                  return (
                    <tr key={id} className="border-b last:border-b-0 align-middle">
                      <td className="px-4 py-3">
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {campaign.subject}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {audienceOptions.find((a) => a.value === campaign.audience)?.label ??
                          campaign.audience}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} className="gap-1">
                          {badge.icon}
                          {statusOptions.find((s) => s.value === campaign.status)?.label ??
                            campaign.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getCreatorName(campaign.created_by)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDateTime(campaign.scheduled_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDateTime(campaign.sent_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {campaign.total_recipients > 0 ? (
                          <span className="font-medium text-green-600">
                            {successRate(campaign)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {campaign.total_recipients > 0 ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({campaign.sent_count}/{campaign.total_recipients})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLogTarget(campaign)}
                            title="Xem log gửi"
                          >
                            <ChevronDown className="size-3.5" />
                            Log
                          </Button>
                          {canSend ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => setSendTarget(campaign)}
                              title="Gửi ngay"
                            >
                              <Send className="size-3.5" />
                              Gửi
                            </Button>
                          ) : null}
                          {canCancel ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-yellow-600 hover:text-yellow-700"
                              onClick={() => setCancelTarget(campaign)}
                              title="Hủy lịch"
                            >
                              <X className="size-3.5" />
                              Hủy lịch
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setEditTarget(campaign)}
                              title="Chỉnh sửa"
                            >
                              <PenLine className="size-3.5" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(campaign)}
                              title="Xóa"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Trang {pagination.page}/{pagination.totalPages} · {pagination.total} chiến dịch
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo chiến dịch email mới</DialogTitle>
            <DialogDescription>
              Điền thông tin và nội dung HTML cho chiến dịch email marketing.
            </DialogDescription>
          </DialogHeader>
          <CampaignForm
            onSubmit={(data) => {
              createMutation.mutate(data, {
                onSuccess: () => setCreateOpen(false),
              })
            }}
            isPending={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chiến dịch</DialogTitle>
            <DialogDescription>{editTarget?.name}</DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <CampaignForm
              initial={{
                name: editTarget.name,
                subject: editTarget.subject,
                html_content: editTarget.html_content,
                audience: editTarget.audience,
                scheduled_at: editTarget.scheduled_at
                  ? new Date(editTarget.scheduled_at).toISOString().slice(0, 16)
                  : "",
              }}
              onSubmit={(data) => {
                updateMutation.mutate(
                  { id: editTarget.id ?? editTarget._id ?? "", input: data },
                  { onSuccess: () => setEditTarget(null) }
                )
              }}
              isPending={updateMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Send Confirm Dialog */}
      <Dialog open={Boolean(sendTarget)} onOpenChange={(open) => !open && setSendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận gửi chiến dịch</DialogTitle>
            <DialogDescription>
              Bạn sắp gửi email đến toàn bộ{" "}
              <strong>
                {audienceOptions.find((a) => a.value === sendTarget?.audience)?.label}
              </strong>{" "}
              trong hệ thống. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">{sendTarget?.name}</p>
            <p className="text-sm text-muted-foreground">{sendTarget?.subject}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendTarget(null)}
              disabled={sendMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                sendMutation.mutate(sendTarget?.id ?? sendTarget?._id ?? "", {
                  onSuccess: () => setSendTarget(null),
                })
              }}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Gửi ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy lịch gửi</DialogTitle>
            <DialogDescription>
              Chiến dịch sẽ chuyển về trạng thái hủy và không còn được tự động gửi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                cancelMutation.mutate(cancelTarget?.id ?? cancelTarget?._id ?? "", {
                  onSuccess: () => setCancelTarget(null),
                })
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Hủy lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa chiến dịch</DialogTitle>
            <DialogDescription>
              Xóa chiến dịch <strong>{deleteTarget?.name}</strong>? Hành động này không thể hoàn
              tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate(deleteTarget?.id ?? deleteTarget?._id ?? "", {
                  onSuccess: () => setDeleteTarget(null),
                })
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Logs Dialog */}
      <Dialog open={Boolean(logTarget)} onOpenChange={(open) => !open && setLogTarget(null)}>
        <DialogContent className="max-w-3xl">
          <Separator className="sr-only" />
          {logTarget ? (
            <SendLogsDrawer campaign={logTarget} onClose={() => setLogTarget(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
