"use client"

import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, MapPin, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UserListItem } from "@/services/user.service"
import type { WorkerProfilePublic } from "@/types"

const GENDER_LABEL: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
}

const EXPERIENCE_LABEL: Record<string, string> = {
  LESS_THAN_1: "Dưới 1 năm",
  ONE_TO_3: "1–3 năm",
  THREE_TO_5: "3–5 năm",
  FIVE_TO_10: "5–10 năm",
  MORE_THAN_10: "Trên 10 năm",
}

const STAR_SIGN_LABEL: Record<string, string> = {
  ARIES: "Bạch Dương",
  TAURUS: "Kim Ngưu",
  GEMINI: "Song Tử",
  CANCER: "Cự Giải",
  LEO: "Sư Tử",
  VIRGO: "Xử Nữ",
  LIBRA: "Thiên Bình",
  SCORPIO: "Bọ Cạp",
  SAGITTARIUS: "Nhân Mã",
  CAPRICORN: "Ma Kết",
  AQUARIUS: "Bảo Bình",
  PISCES: "Song Ngư",
}

function formatDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("vi-VN")
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium break-words">
        {value}
      </span>
    </div>
  )
}

export function UserDetailDialog({
  user,
  onOpenChange,
}: {
  user: UserListItem | null
  onOpenChange: (open: boolean) => void
}) {
  const profile = (user?.worker_profile ?? null) as WorkerProfilePublic | null
  const roles = user?.roles ?? (user?.role ? [user.role] : [])
  const isWorker = roles.includes("worker")

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto sm:max-w-lg">
        {user && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Chi tiết người dùng</DialogTitle>
            </DialogHeader>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full border bg-muted">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    {(user.full_name ?? user.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {user.full_name ?? "—"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="outline" className="capitalize">
                  {r}
                </Badge>
              ))}
              <Badge variant="secondary" className="capitalize">
                {user.status ?? "—"}
              </Badge>
              {user.created_by_admin && (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  Admin tạo
                </Badge>
              )}
              {user.verify_email && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="size-3.5" />
                  Đã xác minh
                </span>
              )}
            </div>

            <Separator className="my-4" />

            {/* Account */}
            <div className="space-y-2">
              <InfoRow label="Điện thoại" value={user.phone ?? "—"} />
              <InfoRow
                label="Gói"
                value={user.meta_data?.pricing_plan_code ?? "—"}
              />
              <InfoRow
                label="Điểm uy tín"
                value={user.meta_data?.reputation_score ?? "—"}
              />
              <InfoRow label="Ngày tạo" value={formatDate(user.created_at)} />
              <InfoRow
                label="Đăng nhập cuối"
                value={formatDate(user.last_login)}
              />
              <InfoRow
                label="ID"
                value={<code className="text-xs">{user.id}</code>}
              />
            </div>

            {/* Worker profile */}
            {isWorker && profile && (
              <>
                <Separator className="my-4" />
                <p className="mb-2 text-sm font-semibold text-muted-foreground">
                  Hồ sơ worker
                </p>
                <div className="space-y-2">
                  <InfoRow label="Chức danh" value={profile.title ?? "—"} />
                  <InfoRow
                    label="Giới tính"
                    value={profile.gender ? GENDER_LABEL[profile.gender] : "—"}
                  />
                  <InfoRow
                    label="Ngày sinh"
                    value={formatDate(profile.date_of_birth)}
                  />
                  <InfoRow
                    label="Kinh nghiệm"
                    value={
                      profile.experience
                        ? EXPERIENCE_LABEL[profile.experience]
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Chiều cao"
                    value={
                      profile.height_cm ? `${profile.height_cm} cm` : undefined
                    }
                  />
                  <InfoRow
                    label="Cân nặng"
                    value={
                      profile.weight_kg ? `${profile.weight_kg} kg` : undefined
                    }
                  />
                  <InfoRow
                    label="Cung hoàng đạo"
                    value={
                      profile.star_sign
                        ? (STAR_SIGN_LABEL[profile.star_sign] ??
                          profile.star_sign)
                        : undefined
                    }
                  />
                  <InfoRow
                    label="Lối sống"
                    value={profile.lifestyle ?? undefined}
                  />
                  <InfoRow
                    label="Châm ngôn"
                    value={profile.quote ?? undefined}
                  />
                </div>

                {profile.introduction && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">Giới thiệu</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {profile.introduction}
                    </p>
                  </div>
                )}

                {!!profile.hobbies?.length && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">Sở thích</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.hobbies.map((h) => (
                        <Badge key={h} variant="secondary">
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!!profile.work_locations?.length && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Khu vực làm việc
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.work_locations.map((w, i) => (
                        <Badge
                          key={`${w.province_code}-${w.ward_code}-${i}`}
                          variant="outline"
                          className="gap-1"
                        >
                          <MapPin className="size-3" />
                          {w.label_snapshot ?? w.province_code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!!profile.gallery_urls?.length && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Thư viện ảnh ({profile.gallery_urls.length})
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {profile.gallery_urls.map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="relative aspect-square overflow-hidden rounded-lg border"
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter className="mt-5">
              {user.created_by_admin ? (
                <Button asChild>
                  <Link href={`/dashboard/users/${user.id}/edit`}>
                    <Pencil className="size-4" />
                    Chỉnh sửa thông tin
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Người dùng thật — không thể chỉnh sửa.
                </p>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
