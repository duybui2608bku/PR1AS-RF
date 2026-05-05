"use client"

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  Building2,
  Camera,
  CalendarDays,
  Loader2,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  User,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMe, useUpdateBasicProfile } from "@/lib/hooks/use-auth"
import { ProfileEditModal } from "@/app/client/profile/components/profile-edit-modal"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { uploadImage } from "@/lib/utils/upload-image"

const formatDateTime = (value?: string | null): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("vi-VN")
}

const toStatusColor = (status?: string): string => {
  if (status?.toLowerCase() === "active") return "bg-muted text-foreground"
  return "bg-muted text-muted-foreground"
}

const toVerifyColor = (verifyEmail?: boolean): string => {
  if (verifyEmail) return "bg-emerald-100 text-emerald-700"
  return "bg-red-100 text-red-700"
}

const toPlanColor = (planCode?: string): string => {
  const code = planCode?.toLowerCase()
  if (code === "gold") return "bg-yellow-100 text-yellow-700"
  if (code === "diamond") return "bg-violet-100 text-violet-700"
  return "bg-muted text-foreground"
}

export default function ClientProfilePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const meQuery = useMe()
  const updateProfileMutation = useUpdateBasicProfile()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const profileData = meQuery.data?.data?.user ?? user
  const userRoles = profileData?.roles ?? []
  const displayName = profileData?.full_name ?? "Người dùng"

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  const closeModal = () => setIsEditModalOpen(false)

  const handleUpdateProfile = async (payload: {
    full_name: string | null
    phone: string | null
    old_password?: string
    password?: string
  }) => {
    if (!profileData) return
    if ((payload.old_password && !payload.password) || (!payload.old_password && payload.password)) {
      toast.warning("Nhập đủ mật khẩu cũ và mật khẩu mới nếu bạn muốn đổi mật khẩu.")
      return
    }

    try {
      const response = await updateProfileMutation.mutateAsync(payload)
      if (!response.success) {
        toast.error(response.message ?? "Cập nhật thất bại.")
        return
      }

      toast.success("Cập nhật hồ sơ thành công.")
      closeModal()
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật hồ sơ."))
    }
  }

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      const avatarUrl = await uploadImage(file)
      const response = await updateProfileMutation.mutateAsync({ avatar: avatarUrl })
      if (!response.success) {
        toast.error(response.message ?? "Không thể cập nhật ảnh đại diện.")
        return
      }
      toast.success("Cập nhật ảnh đại diện thành công.")
    } catch (error) {
      toast.error(getErrorMessage(error, "Tải ảnh thất bại. Vui lòng thử lại."))
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ""
    }
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-5">
        <Card className="overflow-hidden border-border/70">
         
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profileData?.avatar ? (
                  <Image
                    src={profileData.avatar}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="size-24 rounded-full border-4 border-background object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-muted shadow-sm">
                    <User className="size-8 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Cập nhật ảnh đại diện"
                >
                  {isUploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                  <BadgeCheck className="size-5 text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{profileData?.email ?? "—"}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {userRoles.map((role) => (
                    <span key={role} className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button className="gap-2" onClick={() => setIsEditModalOpen(true)}>
              <PencilLine className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="size-5 text-foreground" />
                Chi tiết tài khoản
              </CardTitle>
              <CardDescription>Họ và tên · Email · Số điện thoại</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={<User className="size-4" />} label="Họ và tên" value={profileData?.full_name ?? "—"} />
              <InfoRow icon={<Mail className="size-4" />} label="Email" value={profileData?.email ?? "—"} />
              <InfoRow icon={<Phone className="size-4" />} label="Số điện thoại" value={profileData?.phone ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-5 text-foreground" />
                Trạng thái
              </CardTitle>
              <CardDescription>Vai trò hoạt động cuối · ID người dùng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                icon={<ShieldCheck className="size-4" />}
                label="Trạng thái"
                value={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toStatusColor(profileData?.status)}`}>
                    {profileData?.status ?? "unknown"}
                  </span>
                }
              />
              <InfoRow
                icon={<BadgeCheck className="size-4" />}
                label="Email xác minh"
                value={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toVerifyColor(profileData?.verify_email)}`}>
                    {profileData?.verify_email ? "Đã xác minh" : "Chưa xác minh"}
                  </span>
                }
              />
              <InfoRow
                icon={<User className="size-4" />}
                label="Vai trò hoạt động cuối"
                value={profileData?.last_active_role ?? "—"}
              />
              <InfoRow icon={<User className="size-4" />} label="ID người dùng" value={profileData?.id ?? "—"} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="size-5 text-foreground" />
                Gói thành viên
              </CardTitle>
              <CardDescription>Gói hiện tại và thời hạn hiệu lực của bạn</CardDescription>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toPlanColor(profileData?.pricing_plan_code)}`}>
              {profileData?.pricing_plan_code ?? "standard"}
            </span>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Bắt đầu gói
              </p>
              <p className="font-medium">{formatDateTime(profileData?.pricing_started_at as string | null | undefined)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Hết hạn gói
              </p>
              <p className="font-medium">{formatDateTime(profileData?.pricing_expires_at as string | null | undefined)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProfileEditModal
        open={isEditModalOpen}
        initialFullName={profileData?.full_name}
        initialPhone={profileData?.phone}
        isSubmitting={updateProfileMutation.isPending}
        onClose={closeModal}
        onSubmit={handleUpdateProfile}
      />
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right font-medium">{value}</div>
    </div>
  )
}
