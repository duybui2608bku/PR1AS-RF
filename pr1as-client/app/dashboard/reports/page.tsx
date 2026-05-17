"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function AdminReportsPage() {
  const [targetType, setTargetType] = useState<ReportTargetType | "">("")
  const [status, setStatus] = useState<ReportStatus | "">("open")
  const [banUntil, setBanUntil] = useState("")

  const reportsQuery = useAdminReports({
    page: 1,
    limit: 20,
    target_type: targetType || undefined,
    status: status || undefined,
  })
  const updateStatusMutation = useUpdateReportStatus()
  const restrictionMutation = useCreateRestriction()
  const deletePostMutation = useAdminDeletePost()
  const reports = reportsQuery.data?.data ?? []

  const handleCreateRestriction = (userId: string, feature: RestrictionFeature) => {
    restrictionMutation.mutate({
      user_id: userId,
      feature,
      reason: "Moderation action from report dashboard",
      ends_at: banUntil ? new Date(banUntil).toISOString() : null,
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý báo cáo</h1>
        <p className="text-sm text-muted-foreground">
          Xử lý báo cáo bài viết và worker.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid gap-1">
            <Label>Loại báo cáo</Label>
            <Select
              value={targetType || ALL}
              onValueChange={(value) =>
                setTargetType(value === ALL ? "" : (value as ReportTargetType))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tat ca</SelectItem>
                <SelectItem value="post">Bài viết</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Trạng thái</Label>
            <Select
              value={status || ALL}
              onValueChange={(value) =>
                setStatus(value === ALL ? "" : (value as ReportStatus))
              }
            >
              <SelectTrigger className="w-44">
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
          <div className="grid gap-1">
            <Label>Cận đến lúc</Label>
            <Input
              type="datetime-local"
              className="w-56"
              value={banUntil}
              onChange={(event) => setBanUntil(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
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
