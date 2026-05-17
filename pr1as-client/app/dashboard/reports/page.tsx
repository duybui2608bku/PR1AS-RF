"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
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
import {
  useAdminDeletePost,
  useAdminReports,
  useCreateRestriction,
  useUpdateReportStatus,
} from "@/lib/hooks/use-moderation"
import type {
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
} from "@/services/moderation.service"

const ALL = "all"

function getObjectId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
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

function getPostPreview(value: unknown): string {
  if (!value || typeof value !== "object") return "-"
  const post = value as { body?: string | null }
  const body = post.body ?? ""
  return body.length > 80 ? `${body.slice(0, 80)}...` : body || "-"
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

export default function AdminReportsPage() {
  const [targetType, setTargetType] = useState<ReportTargetType | "">("")
  const [status, setStatus] = useState<ReportStatus | "">("open")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [banDate, setBanDate] = useState<Date | undefined>(undefined)
  const [banTime, setBanTime] = useState("23:59")

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
  const deletePostMutation = useAdminDeletePost()
  const reports = reportsQuery.data?.data ?? []

  const handleCreateRestriction = (userId: string, feature: RestrictionFeature) => {
    let endsAt: string | null = null
    if (banDate) {
      const [hours, minutes] = (banTime || "23:59").split(":").map(Number)
      const combined = new Date(banDate)
      combined.setHours(hours ?? 23, minutes ?? 59, 0, 0)
      endsAt = combined.toISOString()
    }
    restrictionMutation.mutate({
      user_id: userId,
      feature,
      reason: "Moderation action from report dashboard",
      ends_at: endsAt,
    })
  }

  const clearFilters = () => {
    setTargetType("")
    setStatus("open")
    setStartDate("")
    setEndDate("")
  }

  const hasFilters = Boolean(targetType || startDate || endDate) || status !== "open"

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý báo cáo</h1>
        <p className="text-sm text-muted-foreground">
          Xử lý báo cáo bài viết và worker.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <SelectItem value="post">Bài viết</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
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
                  <SelectItem value="open">Đang mở</SelectItem>
                  <SelectItem value="reviewing">Đang xem xét</SelectItem>
                  <SelectItem value="resolved">Đã xử lý</SelectItem>
                  <SelectItem value="rejected">Đã từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
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

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Cấm đến lúc
              </Label>
              <div className="flex gap-2">
                <DatePicker
                  value={banDate}
                  onChange={setBanDate}
                  fromDate={new Date()}
                  placeholder="Chọn ngày"
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

          {hasFilters ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Mobile cards */}
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
              const postId = getObjectId(report.post_id)
              return (
                <div key={id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="capitalize">
                      {report.target_type}
                    </Badge>
                    <Badge className="capitalize">{report.status}</Badge>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="text-muted-foreground">Người báo cáo: </span>
                      <span className="font-medium">
                        {getDisplayName(report.reporter_id)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Đối tượng: </span>
                      <span className="break-words font-medium">
                        {report.target_type === "post"
                          ? getPostPreview(report.post_id)
                          : getDisplayName(report.target_user_id)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lý do: </span>
                      <span>{report.reason}</span>
                    </div>
                    {report.description ? (
                      <div className="text-xs text-muted-foreground">
                        {report.description}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {report.target_type === "post" && postId ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => deletePostMutation.mutate(postId)}
                        >
                          <Trash2 className="size-4" />
                          Xóa bài
                        </Button>
                        {targetUserId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              handleCreateRestriction(targetUserId, "post_create")
                            }
                          >
                            Cấm đăng bài
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    {report.target_type === "worker" && targetUserId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          handleCreateRestriction(targetUserId, "worker_activity")
                        }
                      >
                        Cấm worker
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id,
                          status: "resolved",
                          admin_note: "Handled in dashboard",
                        })
                      }
                    >
                      Xử lý xong
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Loại</th>
                <th className="px-4 py-3 text-left">Người báo cáo</th>
                <th className="px-4 py-3 text-left">Đối tượng</th>
                <th className="px-4 py-3 text-left">Lý do</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reportsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Không có báo cáo phù hợp.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const id = report.id ?? report._id ?? ""
                  const targetUserId = getObjectId(report.target_user_id)
                  const postId = getObjectId(report.post_id)
                  return (
                    <tr key={id} className="border-b align-top last:border-b-0">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{report.target_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {getDisplayName(report.reporter_id)}
                      </td>
                      <td className="px-4 py-3">
                        {report.target_type === "post"
                          ? getPostPreview(report.post_id)
                          : getDisplayName(report.target_user_id)}
                      </td>
                      <td className="px-4 py-3">{report.reason}</td>
                      <td className="max-w-xs px-4 py-3 text-sm text-muted-foreground">
                        {report.description}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{report.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {report.target_type === "post" && postId ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePostMutation.mutate(postId)}
                              >
                                <Trash2 className="size-4" />
                                Xóa bài
                              </Button>
                              {targetUserId ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleCreateRestriction(targetUserId, "post_create")
                                  }
                                >
                                  Cấm đăng bài
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          {report.target_type === "worker" && targetUserId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleCreateRestriction(targetUserId, "worker_activity")
                              }
                            >
                              Cấm worker
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id,
                                status: "resolved",
                                admin_note: "Handled in dashboard",
                              })
                            }
                          >
                            Xử lý xong
                          </Button>
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
    </div>
  )
}
