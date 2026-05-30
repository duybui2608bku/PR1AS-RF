"use client"

import { useState } from "react"
import { Bug, Lightbulb, Loader2, RotateCcw, SlidersHorizontal } from "lucide-react"

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
import {
  useAdminFeedback,
  useUpdateFeedbackStatus,
} from "@/lib/hooks/use-feedback"
import type {
  Feedback,
  FeedbackStatus,
  FeedbackType,
} from "@/services/feedback.service"

const ALL = "all"

const typeOptions: Array<{ value: FeedbackType; label: string }> = [
  { value: "bug", label: "Báo lỗi" },
  { value: "feature", label: "Đề xuất tính năng" },
]

const statusOptions: Array<{ value: FeedbackStatus; label: string }> = [
  { value: "open", label: "Đã gửi" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "rejected", label: "Đã từ chối" },
]

const typeLabels: Record<FeedbackType, string> = {
  bug: "Báo lỗi",
  feature: "Đề xuất tính năng",
}

const statusLabels: Record<FeedbackStatus, string> = statusOptions.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<FeedbackStatus, string>
)

const statusBadgeVariant: Record<
  FeedbackStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "secondary",
  in_progress: "default",
  resolved: "outline",
  rejected: "destructive",
}

function getDisplayName(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const user = value as { full_name?: string | null; email?: string | null }
  return user.full_name || user.email || "-"
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

type StatusDialogState = { id: string; status: FeedbackStatus }

export default function AdminFeedbackPage() {
  const [type, setType] = useState<FeedbackType | "">("")
  const [status, setStatus] = useState<FeedbackStatus | "">("open")

  const [statusDialog, setStatusDialog] = useState<StatusDialogState | null>(
    null
  )
  const [adminNote, setAdminNote] = useState("")

  const feedbackQuery = useAdminFeedback({
    page: 1,
    limit: 30,
    type: type || undefined,
    status: status || undefined,
  })
  const updateMutation = useUpdateFeedbackStatus()
  const feedbacks = feedbackQuery.data?.data ?? []

  const handlePickStatus = (value: string, feedback: Feedback) => {
    const id = feedback.id ?? feedback._id ?? ""
    setAdminNote(feedback.admin_note ?? "")
    setStatusDialog({ id, status: value as FeedbackStatus })
  }

  const confirmUpdate = () => {
    if (!statusDialog) return
    updateMutation.mutate(
      {
        id: statusDialog.id,
        status: statusDialog.status,
        admin_note: adminNote.trim() || null,
      },
      {
        onSuccess: () => {
          setStatusDialog(null)
          setAdminNote("")
        },
      }
    )
  }

  const clearFilters = () => {
    setType("")
    setStatus("open")
  }

  const hasFilters = Boolean(type) || status !== "open"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Phản hồi người dùng
        </h1>
        <p className="text-sm text-muted-foreground">
          Xem và xử lý các báo lỗi và đề xuất tính năng do người dùng gửi.
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Loại</Label>
              <Select
                value={type || ALL}
                onValueChange={(value) =>
                  setType(value === ALL ? "" : (value as FeedbackType))
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {typeOptions.map((option) => (
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
                  setStatus(value === ALL ? "" : (value as FeedbackStatus))
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Tất cả</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden md:hidden">
        <div className="divide-y">
          {feedbackQuery.isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Không có phản hồi phù hợp.
            </div>
          ) : (
            feedbacks.map((feedback) => {
              const id = feedback.id ?? feedback._id ?? ""
              return (
                <div key={id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">
                      {feedback.type === "bug" ? (
                        <Bug className="size-3.5" />
                      ) : (
                        <Lightbulb className="size-3.5" />
                      )}
                      {typeLabels[feedback.type]}
                    </Badge>
                    <Badge variant={statusBadgeVariant[feedback.status]}>
                      {statusLabels[feedback.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium">{feedback.title}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {feedback.description}
                    </p>
                    <div>
                      <span className="text-muted-foreground">
                        Người gửi:{" "}
                      </span>
                      <span>{getDisplayName(feedback.user_id)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày gửi: </span>
                      <span>{formatDateTime(feedback.created_at)}</span>
                    </div>
                    {feedback.admin_note ? (
                      <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                        <span className="font-medium">Ghi chú admin: </span>
                        {feedback.admin_note}
                      </div>
                    ) : null}
                  </div>
                  <Select
                    value=""
                    disabled={updateMutation.isPending}
                    onValueChange={(value) => handlePickStatus(value, feedback)}
                  >
                    <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                      <SelectValue placeholder="Đổi trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <th className="px-4 py-3 text-left">Nội dung</th>
                <th className="px-4 py-3 text-left">Người gửi</th>
                <th className="px-4 py-3 text-left">Ngày gửi</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {feedbackQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Không có phản hồi phù hợp.
                  </td>
                </tr>
              ) : (
                feedbacks.map((feedback) => {
                  const id = feedback.id ?? feedback._id ?? ""
                  return (
                    <tr key={id} className="border-b align-top last:border-b-0">
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {feedback.type === "bug" ? (
                            <Bug className="size-3.5" />
                          ) : (
                            <Lightbulb className="size-3.5" />
                          )}
                          {typeLabels[feedback.type]}
                        </Badge>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="font-medium">{feedback.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {feedback.description}
                        </p>
                        {feedback.admin_note ? (
                          <div className="mt-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs text-foreground">
                            <span className="font-medium">
                              Ghi chú admin:{" "}
                            </span>
                            {feedback.admin_note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {getDisplayName(feedback.user_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDateTime(feedback.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[feedback.status]}>
                          {statusLabels[feedback.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <Select
                            value=""
                            disabled={updateMutation.isPending}
                            onValueChange={(value) =>
                              handlePickStatus(value, feedback)
                            }
                          >
                            <SelectTrigger className="h-9 w-44 data-[size=default]:h-9">
                              <SelectValue placeholder="Đổi trạng thái" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              {statusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

      <Dialog
        open={Boolean(statusDialog)}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) {
            setStatusDialog(null)
            setAdminNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái phản hồi</DialogTitle>
            <DialogDescription>
              Ghi chú admin sẽ hiển thị cho người dùng đã gửi phản hồi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Trạng thái mới:{" "}
              <span className="font-medium">
                {statusDialog ? statusLabels[statusDialog.status] : "-"}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feedback-admin-note">Ghi chú admin</Label>
              <Textarea
                id="feedback-admin-note"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Phản hồi tới người dùng (tùy chọn)..."
                className="min-h-28"
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => {
                setStatusDialog(null)
                setAdminNote("")
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={updateMutation.isPending}
              onClick={confirmUpdate}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
