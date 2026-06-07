"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Megaphone,
  PenLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
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
import { Switch } from "@/components/ui/switch"
import { Table } from "@/components/ui/table"
import { TipTapEditor } from "@/components/ui/tiptap-editor"
import { DatePicker } from "@/components/ui/date-picker"
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/lib/hooks/use-announcements"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
import type {
  Announcement,
  CreateAnnouncementInput,
  DisplayType,
  DisplayBehavior,
  TargetRole,
  RedirectTarget,
} from "@/services/announcement.service"
import { ANNOUNCEMENT_PLACEMENTS } from "@/config/announcement-placements"

const ALL = "all_filter"

const displayTypeOptions: { value: DisplayType; label: string; desc: string }[] = [
  { value: "popup", label: "Popup", desc: "Hộp thoại nổi lên khi mở trang" },
  { value: "banner", label: "Banner", desc: "Dải ngang ở đầu trang" },
  { value: "inline", label: "Inline", desc: "Card nhúng trực tiếp vào trang" },
]

const displayBehaviorOptions: { value: DisplayBehavior; label: string }[] = [
  { value: "always", label: "Luôn hiển thị" },
  { value: "once_device", label: "Một lần / thiết bị" },
  { value: "once_session", label: "Một lần / phiên" },
  { value: "once_daily", label: "Một lần / ngày" },
]

const targetRoleOptions: { value: TargetRole; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "client", label: "Client" },
  { value: "worker", label: "Worker" },
]

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value)
  )
}

function getPlacementLabel(placement: string): string {
  return ANNOUNCEMENT_PLACEMENTS.find((p) => p.value === placement)?.label ?? placement
}

type FormState = {
  content: string
  display_types: DisplayType[]
  display_behavior: DisplayBehavior
  target_roles: TargetRole[]
  placements: string[]
  redirect_url: string
  redirect_target: RedirectTarget
  allow_close: boolean
  is_active: boolean
  start_date: string
  end_date: string
  priority: string
}

const defaultForm: FormState = {
  content: "",
  display_types: ["popup"],
  display_behavior: "once_device",
  target_roles: ["all"],
  placements: ["home_client"],
  redirect_url: "",
  redirect_target: "_blank",
  allow_close: true,
  is_active: false,
  start_date: "",
  end_date: "",
  priority: "0",
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function parseDateTimeStr(value: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "00:00" }
  const [datePart, timePart] = value.split("T")
  if (!datePart) return { date: undefined, time: "00:00" }
  const [y, m, d] = datePart.split("-").map(Number)
  return { date: new Date(y, m - 1, d), time: (timePart ?? "").slice(0, 5) || "00:00" }
}

function buildDateTimeStr(date: Date | undefined, time: string): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}T${time || "00:00"}`
}

function AnnouncementForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial?: Partial<FormState>
  onSubmit: (data: CreateAnnouncementInput) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>({ ...defaultForm, ...initial })

  const parsedStart = parseDateTimeStr(form.start_date)
  const parsedEnd = parseDateTimeStr(form.end_date)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!form.placements.length || !form.display_types.length) return
    onSubmit({
      title: "",
      content: form.content,
      display_types: form.display_types,
      display_behavior: form.display_behavior,
      target_roles: form.target_roles,
      placements: form.placements,
      redirect_url: form.redirect_url.trim() || null,
      redirect_target: form.redirect_target,
      allow_close: form.allow_close,
      is_active: form.is_active,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      priority: parseInt(form.priority, 10) || 0,
    })
  }

  const isValid =
    form.content &&
    form.placements.length > 0 &&
    form.display_types.length > 0

  return (
    <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
      {/* 2-column body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_290px]">
        {/* Left — editor */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex flex-1 flex-col space-y-1.5">
            <Label className="text-sm font-semibold">Nội dung thông báo</Label>
            <TipTapEditor
              value={form.content}
              onChange={(html) => setField("content", html)}
              placeholder="Nhập nội dung thông báo..."
              minHeight="280px"
            />
          </div>
        </div>

        {/* Right — config panel */}
        <div className="flex flex-col gap-4 overflow-y-auto border-l bg-muted/20 p-5">
          {/* Section: Vị trí */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vị trí hiển thị
            </p>
            <div className="flex flex-col gap-1.5">
              {ANNOUNCEMENT_PLACEMENTS.map((p) => (
                <div
                  key={p.value}
                  onClick={() => !isPending && setField("placements", toggle(form.placements, p.value))}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors",
                    form.placements.includes(p.value)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60"
                  )}
                >
                  <Checkbox
                    checked={form.placements.includes(p.value)}
                    onCheckedChange={() => setField("placements", toggle(form.placements, p.value))}
                    disabled={isPending}
                  />
                  <p className="text-sm font-medium leading-none">{p.label}</p>
                </div>
              ))}
            </div>
            {form.placements.length === 0 && (
              <p className="text-xs text-destructive">Chọn ít nhất 1 vị trí.</p>
            )}
          </div>

          {/* Section: Kiểu hiển thị */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kiểu hiển thị
            </p>
            <div className="flex flex-col gap-1.5">
              {displayTypeOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() =>
                    !isPending && setField("display_types", toggle(form.display_types, opt.value))
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors",
                    form.display_types.includes(opt.value)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60"
                  )}
                >
                  <Checkbox
                    checked={form.display_types.includes(opt.value)}
                    onCheckedChange={() =>
                      setField("display_types", toggle(form.display_types, opt.value))
                    }
                    disabled={isPending}
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {form.display_types.length === 0 && (
              <p className="text-xs text-destructive">Chọn ít nhất 1 kiểu.</p>
            )}
          </div>

          <div className="border-t" />

          {/* Section: Hành vi */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Hành vi
            </p>
            <Select
              value={form.display_behavior}
              onValueChange={(v) => setField("display_behavior", v as DisplayBehavior)}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayBehaviorOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section: Đối tượng */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Đối tượng
            </p>
            <div className="flex gap-1.5">
              {targetRoleOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => setField("target_roles", toggle(form.target_roles, opt.value))}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    form.target_roles.includes(opt.value)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Section: Link redirect */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Link redirect
            </p>
            <Input
              value={form.redirect_url}
              onChange={(e) => setField("redirect_url", e.target.value)}
              placeholder="https://... (tùy chọn)"
              disabled={isPending}
              className="bg-background"
            />
            {form.redirect_url && (
              <Select
                value={form.redirect_target}
                onValueChange={(v) => setField("redirect_target", v as RedirectTarget)}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_blank">Mở tab mới</SelectItem>
                  <SelectItem value="_self">Cùng tab</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Section: Thời gian */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Thời gian (tùy chọn)
            </p>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bắt đầu</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={parsedStart.date}
                    onChange={(date) => setField("start_date", buildDateTimeStr(date, parsedStart.time))}
                    placeholder="Chọn ngày bắt đầu"
                    disabled={isPending}
                  />
                </div>
                <Input
                  type="time"
                  value={parsedStart.time}
                  onChange={(e) =>
                    setField("start_date", buildDateTimeStr(parsedStart.date, e.target.value))
                  }
                  disabled={isPending || !parsedStart.date}
                  className="w-24 bg-background h-9"
                />
                {parsedStart.date ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setField("start_date", "")}
                    disabled={isPending}
                    title="Xóa thời gian bắt đầu"
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kết thúc</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={parsedEnd.date}
                    onChange={(date) => setField("end_date", buildDateTimeStr(date, parsedEnd.time))}
                    placeholder="Chọn ngày kết thúc"
                    disabled={isPending}
                  />
                </div>
                <Input
                  type="time"
                  value={parsedEnd.time}
                  onChange={(e) =>
                    setField("end_date", buildDateTimeStr(parsedEnd.date, e.target.value))
                  }
                  disabled={isPending || !parsedEnd.date}
                  className="w-24 bg-background h-9"
                />
                {parsedEnd.date ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setField("end_date", "")}
                    disabled={isPending}
                    title="Xóa thời gian kết thúc"
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Section: Độ ưu tiên */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Độ ưu tiên
            </p>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              placeholder="0"
              disabled={isPending}
              className="bg-background"
            />
            <p className="text-[11px] text-muted-foreground">Số cao hơn hiển thị trước.</p>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Cho phép đóng</p>
                <p className="text-xs text-muted-foreground">Hiện nút ✕</p>
              </div>
              <Switch
                checked={form.allow_close}
                onCheckedChange={(v) => setField("allow_close", v)}
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Kích hoạt</p>
                <p className="text-xs text-muted-foreground">Hiển thị ngay</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setField("is_active", v)}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer — always visible */}
      <div className="flex justify-end gap-2 border-t bg-background px-5 py-3">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !isValid}>
          {isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          Lưu thông báo
        </Button>
      </div>
    </div>
  )
}

function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
}: {
  announcement: Announcement
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="border-muted/70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{announcement.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {announcement.placements.map((p) => getPlacementLabel(p)).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
              <PenLine className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {announcement.display_types.map((dt) => (
            <Badge
              key={dt}
              variant={dt === "popup" ? "default" : dt === "banner" ? "secondary" : "outline"}
            >
              {dt}
            </Badge>
          ))}
          <Badge variant={announcement.is_active ? "outline" : "secondary"}>
            {announcement.is_active ? "Đang hiện" : "Ẩn"}
          </Badge>
          {announcement.redirect_url && (
            <Badge variant="secondary" className="gap-1">
              <ExternalLink className="size-3" /> Link
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(announcement.created_at)}</p>
      </CardContent>
    </Card>
  )
}

function formFromAnnouncement(a: Announcement): Partial<FormState> {
  return {
    content: a.content,
    display_types: a.display_types,
    display_behavior: a.display_behavior,
    target_roles: a.target_roles as TargetRole[],
    placements: a.placements,
    redirect_url: a.redirect_url ?? "",
    redirect_target: a.redirect_target,
    allow_close: a.allow_close,
    is_active: a.is_active,
    start_date: a.start_date ? new Date(a.start_date).toISOString().slice(0, 16) : "",
    end_date: a.end_date ? new Date(a.end_date).toISOString().slice(0, 16) : "",
    priority: String(a.priority),
  }
}

export default function AnnouncementsPage() {
  const isMobile = useIsMobile()
  const [page, setPage] = useState(1)
  const [filterPlacement, setFilterPlacement] = useState("")
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("")

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const query = useAdminAnnouncements({
    page,
    limit: 20,
    placement: filterPlacement || undefined,
    is_active: filterActive === "" ? undefined : filterActive === "true",
  })
  const announcements = query.data?.data ?? []
  const pagination = query.data?.pagination

  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()

  const hasFilters = Boolean(filterPlacement) || Boolean(filterActive)
  const clearFilters = () => {
    setFilterPlacement("")
    setFilterActive("")
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-sm text-muted-foreground">
            Tạo và quản lý thông báo hiển thị cho người dùng trong hệ thống.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          Tạo thông báo
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-muted/70 shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              Bộ lọc
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RotateCcw className="size-4" />
                Xóa lọc
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Vị trí</Label>
              <Select
                value={filterPlacement || ALL}
                onValueChange={(v) => {
                  setFilterPlacement(v === ALL ? "" : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {ANNOUNCEMENT_PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Trạng thái</Label>
              <Select
                value={filterActive || ALL}
                onValueChange={(v) => {
                  setFilterActive(v === ALL ? "" : (v as "true" | "false"))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  <SelectItem value="true">Đang hiện</SelectItem>
                  <SelectItem value="false">Đang ẩn</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isMobile ? (
        <div className="space-y-3">
          {query.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </div>
          ) : (
            announcements.map((ann) => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                onEdit={() => setEditTarget(ann)}
                onDelete={() => setDeleteTarget(ann)}
              />
            ))
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">Tiêu đề</th>
                  <th className="px-4 py-3 text-left text-sm">Slots</th>
                  <th className="px-4 py-3 text-left text-sm">Kiểu hiển thị</th>
                  <th className="px-4 py-3 text-left text-sm">Hành vi</th>
                  <th className="px-4 py-3 text-left text-sm">Đối tượng</th>
                  <th className="px-4 py-3 text-left text-sm">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-sm">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      Chưa có thông báo nào. Nhấn &quot;Tạo thông báo&quot; để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  announcements.map((ann) => (
                    <tr key={ann.id} className="border-b last:border-b-0 align-middle">
                      <td className="max-w-[160px] px-4 py-3">
                        <p className="truncate font-medium">{ann.title}</p>
                        {ann.redirect_url && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <ExternalLink className="size-3 shrink-0" />
                            {ann.redirect_url}
                          </p>
                        )}
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ann.placements.map((p) => (
                            <code key={p} className="rounded bg-muted px-1 py-0.5 text-xs">
                              {p}
                            </code>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ann.display_types.map((dt) => (
                            <Badge
                              key={dt}
                              variant={
                                dt === "popup"
                                  ? "default"
                                  : dt === "banner"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {dt}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {displayBehaviorOptions.find((o) => o.value === ann.display_behavior)?.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ann.target_roles.join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ann.is_active ? "outline" : "secondary"}>
                          {ann.is_active ? "Đang hiện" : "Ẩn"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDateTime(ann.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditTarget(ann)}
                            title="Chỉnh sửa"
                          >
                            <PenLine className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(ann)}
                            title="Xóa"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Trang {pagination.page}/{pagination.totalPages} · {pagination.total} thông báo
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
          )}
        </Card>
      )}

      {/* Mobile pagination */}
      {isMobile && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pagination.page}/{pagination.totalPages} · {pagination.total} thông báo
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
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[920px] w-[95vw] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4" />
              Tạo thông báo mới
            </DialogTitle>
            <DialogDescription className="text-xs">
              Điền thông tin và cấu hình hiển thị cho thông báo.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            onSubmit={(data) => {
              createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) })
            }}
            isPending={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="max-w-[920px] w-[95vw] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <PenLine className="size-4" />
              Chỉnh sửa thông báo
            </DialogTitle>
            <DialogDescription className="truncate text-xs">{editTarget?.title}</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <AnnouncementForm
              initial={formFromAnnouncement(editTarget)}
              onSubmit={(data) => {
                updateMutation.mutate(
                  { id: editTarget.id, input: data },
                  { onSuccess: () => setEditTarget(null) }
                )
              }}
              isPending={updateMutation.isPending}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thông báo</DialogTitle>
            <DialogDescription>
              Xóa thông báo <strong>{deleteTarget?.title}</strong>? Hành động này không thể hoàn tác.
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
                deleteMutation.mutate(deleteTarget?.id ?? "", {
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
    </div>
  )
}
