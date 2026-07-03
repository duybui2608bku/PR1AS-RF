"use client"

import { useState } from "react"
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  useAdminVouchers,
  useCreateVouchers,
  useDeleteVoucher,
  useUpdateVoucher,
} from "@/lib/hooks/use-vouchers"
import type {
  CreateVouchersInput,
  Voucher,
  VoucherPlanCode,
} from "@/services/voucher.service"

const ALL = "all"

const planMeta: Record<
  VoucherPlanCode,
  { label: string; icon: React.ReactNode; className: string }
> = {
  gold: {
    label: "Gold",
    icon: <Star className="size-3 fill-amber-400 text-amber-400" />,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  diamond: {
    label: "Diamond",
    icon: <Sparkles className="size-3 text-violet-500" />,
    className:
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
}

function formatDate(value?: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(
    new Date(value)
  )
}

function voucherStatus(voucher: Voucher): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  if (!voucher.is_active) return { label: "Đã tắt", variant: "secondary" }
  if (voucher.expires_at && new Date(voucher.expires_at) <= new Date())
    return { label: "Hết hạn", variant: "destructive" }
  if (voucher.used_count >= voucher.max_uses)
    return { label: "Hết lượt", variant: "destructive" }
  return { label: "Hoạt động", variant: "default" }
}

function endOfDayISO(d: Date): string {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

type FormState = {
  plan_code: VoucherPlanCode
  duration_months: string
  max_uses: string
  quantity: string
  code: string
  expires_at: Date | undefined
  note: string
}

const defaultForm: FormState = {
  plan_code: "gold",
  duration_months: "1",
  max_uses: "1",
  quantity: "1",
  code: "",
  expires_at: undefined,
  note: "",
}

export default function AdminVouchersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filterPlan, setFilterPlan] = useState<VoucherPlanCode | "">("")
  const [filterActive, setFilterActive] = useState<"true" | "false" | "">("")
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [createdCodes, setCreatedCodes] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null)

  const vouchersQuery = useAdminVouchers({
    page,
    limit: 20,
    search: search || undefined,
    plan_code: filterPlan || undefined,
    is_active: filterActive || undefined,
  })
  const vouchers = vouchersQuery.data?.data ?? []
  const pagination = vouchersQuery.data?.pagination

  const createMutation = useCreateVouchers()
  const updateMutation = useUpdateVoucher()
  const deleteMutation = useDeleteVoucher()

  const hasFilters = Boolean(search) || Boolean(filterPlan) || Boolean(filterActive)

  const clearFilters = () => {
    setSearch("")
    setSearchInput("")
    setFilterPlan("")
    setFilterActive("")
    setPage(1)
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success("Đã sao chép mã voucher.")
  }

  const handleCreateSubmit = () => {
    const durationMonths = Number(form.duration_months)
    const maxUses = Number(form.max_uses)
    const quantity = Number(form.quantity)

    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24) {
      toast.error("Thời hạn phải từ 1 đến 24 tháng.")
      return
    }
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      toast.error("Số lượt dùng tối đa phải là số nguyên dương.")
      return
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      toast.error("Số lượng mã phải từ 1 đến 100.")
      return
    }
    const customCode = form.code.trim()
    if (customCode && quantity !== 1) {
      toast.error("Chỉ dùng được mã tùy chỉnh khi tạo 1 mã.")
      return
    }
    if (customCode && !/^[A-Za-z0-9-]{4,32}$/.test(customCode)) {
      toast.error("Mã tùy chỉnh chỉ gồm chữ, số, dấu gạch ngang (4-32 ký tự).")
      return
    }

    const payload: CreateVouchersInput = {
      plan_code: form.plan_code,
      duration_months: durationMonths,
      max_uses: maxUses,
      quantity,
      ...(customCode && { code: customCode }),
      ...(form.expires_at && { expires_at: endOfDayISO(form.expires_at) }),
      ...(form.note.trim() && { note: form.note.trim() }),
    }

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        setCreateOpen(false)
        setForm(defaultForm)
        setCreatedCodes(created.map((v) => v.code))
      },
    })
  }

  const handleToggleActive = (voucher: Voucher) => {
    updateMutation.mutate({
      id: voucher.id,
      input: { is_active: !voucher.is_active },
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voucher</h1>
          <p className="text-sm text-muted-foreground">
            Tạo mã voucher kích hoạt gói Gold/Diamond theo tháng cho người dùng.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" />
          Tạo voucher
        </Button>
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
              <Label className="text-xs text-muted-foreground">Tìm theo mã</Label>
              <div className="flex gap-2">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearch(searchInput.trim())
                      setPage(1)
                    }
                  }}
                  placeholder="VD: PR1AS-ABC..."
                  className="h-9"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() => {
                    setSearch(searchInput.trim())
                    setPage(1)
                  }}
                >
                  <Search className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Gói</Label>
              <Select
                value={filterPlan || ALL}
                onValueChange={(v) => {
                  setFilterPlan(v === ALL ? "" : (v as VoucherPlanCode))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
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
                  <SelectItem value="true">Đang bật</SelectItem>
                  <SelectItem value="false">Đã tắt</SelectItem>
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
                <th className="px-4 py-3 text-left text-sm">Mã voucher</th>
                <th className="px-4 py-3 text-left text-sm">Gói</th>
                <th className="px-4 py-3 text-left text-sm">Thời hạn</th>
                <th className="px-4 py-3 text-left text-sm">Lượt dùng</th>
                <th className="px-4 py-3 text-left text-sm">Hạn nhập mã</th>
                <th className="px-4 py-3 text-left text-sm">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm">Ghi chú</th>
                <th className="px-4 py-3 text-left text-sm">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vouchersQuery.isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <Ticket className="mx-auto mb-2 size-6" />
                    Chưa có voucher nào.
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => {
                  const meta = planMeta[voucher.plan_code]
                  const status = voucherStatus(voucher)
                  return (
                    <tr
                      key={voucher.id}
                      className="border-b align-middle last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">
                            {voucher.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleCopy(voucher.code)}
                            title="Sao chép mã"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {voucher.duration_months} tháng
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">{voucher.used_count}</span>
                        <span className="text-muted-foreground">
                          /{voucher.max_uses}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {voucher.expires_at ? formatDate(voucher.expires_at) : "Không giới hạn"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="max-w-40 px-4 py-3 text-sm text-muted-foreground">
                        <span className="line-clamp-1" title={voucher.note ?? undefined}>
                          {voucher.note || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(voucher.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleToggleActive(voucher)}
                            disabled={updateMutation.isPending}
                            title={voucher.is_active ? "Tắt voucher" : "Bật voucher"}
                          >
                            {voucher.is_active ? (
                              <>
                                <Ban className="size-3.5" />
                                Tắt
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3.5" />
                                Bật
                              </>
                            )}
                          </Button>
                          {voucher.used_count === 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(voucher)}
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
              Trang {pagination.page}/{pagination.totalPages} · {pagination.total}{" "}
              voucher
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo voucher mới</DialogTitle>
            <DialogDescription>
              Người dùng nhập mã sẽ được kích hoạt gói tương ứng theo số tháng cấu
              hình.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Gói đăng ký</Label>
                <Select
                  value={form.plan_code}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, plan_code: v as VoucherPlanCode }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Thời hạn (tháng)</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={form.duration_months}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_months: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Số lượng mã</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Tạo nhiều mã ngẫu nhiên cùng lúc (tối đa 100).
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Lượt dùng tối đa / mã</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_uses: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Mỗi người dùng chỉ nhập được 1 lần.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mã tùy chỉnh (tùy chọn)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Để trống để tạo mã ngẫu nhiên"
                disabled={Number(form.quantity) > 1}
              />
              {Number(form.quantity) > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Mã tùy chỉnh chỉ dùng được khi số lượng là 1.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Hạn nhập mã (tùy chọn)</Label>
              <DatePicker
                value={form.expires_at}
                onChange={(date) => setForm((f) => ({ ...f, expires_at: date }))}
                placeholder="Không giới hạn"
                fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
              />
              <p className="text-xs text-muted-foreground">
                Sau ngày này voucher không thể nhập nữa (gói đã kích hoạt không bị
                ảnh hưởng).
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ghi chú (tùy chọn)</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="VD: Chiến dịch khai trương tháng 7"
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Tạo voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created codes result dialog */}
      <Dialog
        open={createdCodes.length > 0}
        onOpenChange={(open) => !open && setCreatedCodes([])}
      >
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Đã tạo {createdCodes.length} mã voucher</DialogTitle>
            <DialogDescription>
              Sao chép và gửi mã cho người dùng. Bạn cũng có thể xem lại trong bảng
              danh sách.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {createdCodes.map((code) => (
              <div
                key={code}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"
              >
                <code className="font-mono text-sm font-semibold">{code}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => handleCopy(code)}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(createdCodes.join("\n"))
                toast.success("Đã sao chép tất cả mã.")
              }}
            >
              <Copy className="size-4" />
              Sao chép tất cả
            </Button>
            <Button onClick={() => setCreatedCodes([])}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa voucher</DialogTitle>
            <DialogDescription>
              Xóa mã{" "}
              <code className="font-mono font-semibold">{deleteTarget?.code}</code>?
              Hành động này không thể hoàn tác.
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
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
