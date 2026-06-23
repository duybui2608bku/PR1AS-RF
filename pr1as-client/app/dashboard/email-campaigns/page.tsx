"use client"

import { useState } from "react"
import {
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
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
import type { DateRange } from "react-day-picker"
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
import { Table } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TipTapEditor } from "@/components/ui/tiptap-editor"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  useEmailCampaigns,
  useEmailCampaignLogs,
  useCreateEmailCampaign,
  useUpdateEmailCampaign,
  useDeleteEmailCampaign,
  useSendEmailCampaign,
  useCancelEmailCampaign,
} from "@/lib/hooks/use-email-campaign"
import {
  EMAIL_CAMPAIGN_LOCALES,
  type EmailCampaign,
  type EmailCampaignAudience,
  type EmailCampaignLocale,
  type EmailCampaignStatus,
  type EmailSendLog,
  type EmailSendLogStatus,
  type CreateCampaignInput,
  type LocalizedEmailContent,
} from "@/services/email-campaign.service"

const ALL = "all"

const localeLabels: Record<EmailCampaignLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  ko: "한국어",
}

/** Best string for a locale, falling back to the default then any non-empty. */
function pickLocalized(
  field: LocalizedEmailContent | undefined,
  locale: EmailCampaignLocale,
  fallback: EmailCampaignLocale
): string {
  if (!field) return ""
  const order: EmailCampaignLocale[] = [
    locale,
    fallback,
    ...EMAIL_CAMPAIGN_LOCALES,
  ]
  for (const key of order) {
    const value = field[key]
    if (value && value.trim() !== "") return value
  }
  return ""
}

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

function startOfDayISO(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function endOfDayISO(d: Date): string {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

// scheduled_at is kept as a local "YYYY-MM-DDTHH:mm" string inside the form.
function parseScheduled(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "09:00" }
  const [datePart, timePart] = value.split("T")
  const [y, m, d] = datePart.split("-").map(Number)
  return { date: new Date(y, m - 1, d), time: (timePart ?? "").slice(0, 5) || "09:00" }
}

function buildScheduled(date: Date | undefined, time: string): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}T${time || "09:00"}`
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
  subject: LocalizedEmailContent
  html_content: LocalizedEmailContent
  default_locale: EmailCampaignLocale
  audience: EmailCampaignAudience
  scheduled_at: string
}

const defaultForm: FormState = {
  name: "",
  subject: { vi: "", en: "", zh: "", ko: "" },
  html_content: { vi: "", en: "", zh: "", ko: "" },
  default_locale: "vi",
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
  const [activeLocale, setActiveLocale] = useState<EmailCampaignLocale>(
    initial?.default_locale ?? "vi"
  )

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setLocalized(
    key: "subject" | "html_content",
    locale: EmailCampaignLocale,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [locale]: value },
    }))
  }

  function trimLocalized(field: LocalizedEmailContent): LocalizedEmailContent {
    return {
      vi: (field.vi ?? "").trim(),
      en: (field.en ?? "").trim(),
      zh: (field.zh ?? "").trim(),
    }
  }

  const scheduled = parseScheduled(form.scheduled_at)

  // The default locale must always carry content — it's the fallback every
  // recipient without a matching translation receives.
  const defaultSubjectFilled = Boolean(
    (form.subject[form.default_locale] ?? "").trim()
  )
  const defaultContentFilled = Boolean(
    (form.html_content[form.default_locale] ?? "").trim()
  )

  function handleSubmit() {
    onSubmit({
      name: form.name.trim(),
      subject: trimLocalized(form.subject),
      html_content: trimLocalized(form.html_content),
      default_locale: form.default_locale,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label htmlFor="ec-default-locale">Ngôn ngữ mặc định (dự phòng)</Label>
          <Select
            value={form.default_locale}
            onValueChange={(v) => {
              const locale = v as EmailCampaignLocale
              set("default_locale", locale)
              setActiveLocale(locale)
            }}
            disabled={isPending}
          >
            <SelectTrigger id="ec-default-locale" className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_CAMPAIGN_LOCALES.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {localeLabels[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Lên lịch gửi (tùy chọn)</Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-44 flex-1">
            <DatePicker
              value={scheduled.date}
              onChange={(date) => set("scheduled_at", buildScheduled(date, scheduled.time))}
              placeholder="Chọn ngày gửi"
              disabled={isPending}
              captionLayout="dropdown"
              fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
          <Input
            type="time"
            value={scheduled.time}
            onChange={(e) =>
              set("scheduled_at", buildScheduled(scheduled.date, e.target.value))
            }
            disabled={isPending || !scheduled.date}
            className="w-32"
          />
          {scheduled.date ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => set("scheduled_at", "")}
              disabled={isPending}
              title="Xóa lịch"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Để trống nếu muốn lưu bản nháp và gửi thủ công.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Nội dung email theo ngôn ngữ</Label>
        <p className="text-xs text-muted-foreground">
          Mỗi người dùng nhận email theo ngôn ngữ họ đã chọn. Ngôn ngữ chưa soạn
          sẽ tự động dùng nội dung của ngôn ngữ mặc định.
        </p>
        <Tabs
          value={activeLocale}
          onValueChange={(v) => setActiveLocale(v as EmailCampaignLocale)}
          className="gap-3"
        >
          <TabsList className="w-full">
            {EMAIL_CAMPAIGN_LOCALES.map((locale) => {
              const filled = Boolean((form.subject[locale] ?? "").trim())
              return (
                <TabsTrigger key={locale} value={locale} className="gap-1.5">
                  {localeLabels[locale]}
                  {locale === form.default_locale ? (
                    <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                      Mặc định
                    </Badge>
                  ) : filled ? (
                    <CheckCircle className="size-3 text-green-600" />
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {EMAIL_CAMPAIGN_LOCALES.map((locale) => (
            <TabsContent key={locale} value={locale} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`ec-subject-${locale}`}>
                  Tiêu đề email ({localeLabels[locale]})
                </Label>
                <Input
                  id={`ec-subject-${locale}`}
                  value={form.subject[locale] ?? ""}
                  onChange={(e) => setLocalized("subject", locale, e.target.value)}
                  placeholder="Tiêu đề hiển thị trong hộp thư"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nội dung ({localeLabels[locale]})</Label>
                <TipTapEditor
                  value={form.html_content[locale] ?? ""}
                  onChange={(html) => setLocalized("html_content", locale, html)}
                  placeholder="Soạn nội dung email... Dùng thanh công cụ để định dạng hoặc chuyển sang chế độ HTML."
                  minHeight="240px"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
        {(!defaultSubjectFilled || !defaultContentFilled) && form.name ? (
          <p className="text-xs text-destructive">
            Vui lòng nhập tiêu đề và nội dung cho ngôn ngữ mặc định (
            {localeLabels[form.default_locale]}).
          </p>
        ) : null}
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
            !defaultSubjectFilled ||
            !defaultContentFilled
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Lưu
        </Button>
      </DialogFooter>
    </div>
  )
}

function EmailContentPreview({ campaign }: { campaign: EmailCampaign }) {
  const fallback = campaign.default_locale ?? "vi"
  const [locale, setLocale] = useState<EmailCampaignLocale>(fallback)
  const subject = campaign.subject?.[locale] ?? ""
  const html = campaign.html_content?.[locale] ?? ""
  const usesFallback = !subject.trim() && !html.trim() && locale !== fallback
  const shownSubject = pickLocalized(campaign.subject, locale, fallback)
  const shownHtml = pickLocalized(campaign.html_content, locale, fallback)

  return (
    <div className="space-y-3">
      <Tabs
        value={locale}
        onValueChange={(v) => setLocale(v as EmailCampaignLocale)}
        className="gap-3"
      >
        <TabsList className="w-full">
          {EMAIL_CAMPAIGN_LOCALES.map((l) => (
            <TabsTrigger key={l} value={l} className="gap-1.5">
              {localeLabels[l]}
              {l === fallback ? (
                <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                  Mặc định
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {usesFallback ? (
        <p className="text-xs text-muted-foreground">
          Chưa có bản dịch riêng cho {localeLabels[locale]} — đang hiển thị nội
          dung ngôn ngữ mặc định ({localeLabels[fallback]}).
        </p>
      ) : null}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">Tiêu đề email</p>
        <p className="font-medium">{shownSubject || "-"}</p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Xem trước nội dung
        </div>
        {shownHtml ? (
          <iframe
            title="Xem trước nội dung email"
            srcDoc={shownHtml}
            sandbox=""
            className="h-[360px] w-full bg-white"
          />
        ) : (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Chiến dịch chưa có nội dung.
          </p>
        )}
      </div>
    </div>
  )
}

function SendLogsDrawer({ campaign }: { campaign: EmailCampaign }) {
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
      <div>
        <h2 className="font-semibold">{campaign.name}</h2>
        <p className="text-sm text-muted-foreground">
          Nội dung và lịch sử gửi của chiến dịch.
        </p>
      </div>

      <Tabs defaultValue="content" className="gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="content" className="gap-1.5">
            <FileText className="size-3.5" />
            Nội dung email
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Send className="size-3.5" />
            Log gửi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <EmailContentPreview campaign={campaign} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
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
              <th className="px-3 py-2 text-left text-xs">Ngôn ngữ</th>
              <th className="px-3 py-2 text-left text-xs">Trạng thái</th>
              <th className="px-3 py-2 text-left text-xs">Thời gian gửi</th>
              <th className="px-3 py-2 text-left text-xs">Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {logsQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Không có log phù hợp.
                </td>
              </tr>
            ) : (
              logs.map((log: EmailSendLog) => (
                <tr key={log.id ?? log._id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-sm">{log.recipient_email}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {log.locale ? localeLabels[log.locale] : "-"}
                  </td>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EmailCampaignsPage() {
  const [filterStatus, setFilterStatus] = useState<EmailCampaignStatus | "">("")
  const [filterAudience, setFilterAudience] = useState<EmailCampaignAudience | "">("")
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EmailCampaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailCampaign | null>(null)
  const [sendTarget, setSendTarget] = useState<EmailCampaign | null>(null)
  const [cancelTarget, setCancelTarget] = useState<EmailCampaign | null>(null)
  const [logTarget, setLogTarget] = useState<EmailCampaign | null>(null)

  const dateTo = filterDateRange?.to ?? filterDateRange?.from
  const campaignsQuery = useEmailCampaigns({
    page,
    limit: 20,
    status: filterStatus || undefined,
    audience: filterAudience || undefined,
    from: filterDateRange?.from ? startOfDayISO(filterDateRange.from) : undefined,
    to: dateTo ? endOfDayISO(dateTo) : undefined,
  })
  const campaigns = campaignsQuery.data?.data ?? []
  const pagination = campaignsQuery.data?.pagination

  const createMutation = useCreateEmailCampaign()
  const updateMutation = useUpdateEmailCampaign()
  const deleteMutation = useDeleteEmailCampaign()
  const sendMutation = useSendEmailCampaign()
  const cancelMutation = useCancelEmailCampaign()

  const hasFilters =
    Boolean(filterStatus) || Boolean(filterAudience) || Boolean(filterDateRange?.from)

  const clearFilters = () => {
    setFilterStatus("")
    setFilterAudience("")
    setFilterDateRange(undefined)
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
              <DateRangePicker
                value={filterDateRange}
                onChange={(range) => {
                  setFilterDateRange(range)
                  setPage(1)
                }}
                placeholder="Chọn khoảng ngày"
                buttonClassName="h-9"
              />
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
                          {pickLocalized(
                            campaign.subject,
                            campaign.default_locale,
                            campaign.default_locale
                          )}
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chiến dịch</DialogTitle>
            <DialogDescription>{editTarget?.name}</DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <CampaignForm
              initial={{
                name: editTarget.name,
                subject: {
                  vi: editTarget.subject?.vi ?? "",
                  en: editTarget.subject?.en ?? "",
                  zh: editTarget.subject?.zh ?? "",
                },
                html_content: {
                  vi: editTarget.html_content?.vi ?? "",
                  en: editTarget.html_content?.en ?? "",
                  zh: editTarget.html_content?.zh ?? "",
                },
                default_locale: editTarget.default_locale ?? "vi",
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
            <p className="text-sm text-muted-foreground">
              {sendTarget
                ? pickLocalized(
                    sendTarget.subject,
                    sendTarget.default_locale,
                    sendTarget.default_locale
                  )
                : ""}
            </p>
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogTitle className="sr-only">Chi tiết chiến dịch email</DialogTitle>
          {logTarget ? <SendLogsDrawer campaign={logTarget} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
