"use client"

import { ChangeEvent, ReactNode, useRef, useState } from "react"
import Image from "next/image"
import {
  BadgeCheck,
  Building2,
  Camera,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  User,
  UserCog,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageEditorDialog } from "@/components/ui/image-editor-dialog"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { isPasswordStrong } from "@/lib/auth/password.utils"
import { useMe, useUpdateBasicProfile } from "@/lib/hooks/use-auth"
import { useImageEditorQueue } from "@/lib/hooks/use-image-editor-queue"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"
import { getReputationBadgeClass, getReputationScore } from "@/lib/utils/reputation"
import { uploadImage } from "@/lib/utils/upload-image"
import { validateImageFile } from "@/lib/utils/validate-upload"

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
  if (verifyEmail)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
}

const toPlanColor = (planCode?: string): string => {
  const code = planCode?.toLowerCase()
  if (code === "gold")
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
  if (code === "diamond")
    return "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
  return "bg-muted text-foreground"
}

export default function ClientProfilePage() {
  const user = useAuthStore((s) => s.user)
  const meQuery = useMe()
  const updateProfileMutation = useUpdateBasicProfile()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarEditor = useImageEditorQueue()

  const profileData = meQuery.data?.data?.user ?? user
  const userRoles = profileData?.roles ?? []
  const displayName = profileData?.full_name ?? "Người dùng"
  const reputationScore = getReputationScore(profileData?.meta_data?.reputation_score)

  // Lưu một field cơ bản (tên / sđt). API cập nhật từng phần nên chỉ gửi field đổi.
  const saveBasic = async (payload: {
    full_name?: string | null
    phone?: string | null
  }): Promise<boolean> => {
    try {
      const response = await updateProfileMutation.mutateAsync(payload)
      if (!response.success) {
        toast.error(localizeServerMessage(response.message, "Cập nhật thất bại."))
        return false
      }
      toast.success("Cập nhật hồ sơ thành công.")
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật hồ sơ."))
      return false
    }
  }

  const savePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    if (!isPasswordStrong(newPassword)) {
      toast.error("Mật khẩu mới chưa đáp ứng đủ điều kiện bảo mật.")
      return false
    }
    try {
      const response = await updateProfileMutation.mutateAsync({
        old_password: oldPassword,
        password: newPassword,
      })
      if (!response.success) {
        toast.error(localizeServerMessage(response.message, "Đổi mật khẩu thất bại."))
        return false
      }
      toast.success("Đổi mật khẩu thành công.")
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đổi mật khẩu."))
      return false
    }
  }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    avatarEditor.start([file], async ([croppedFile]) => {
      try {
        setIsUploadingAvatar(true)
        const avatarUrl = await uploadImage(croppedFile)
        const response = await updateProfileMutation.mutateAsync({ avatar: avatarUrl })
        if (!response.success) {
          toast.error(localizeServerMessage(response.message, "Không thể cập nhật ảnh đại diện."))
          return
        }
        toast.success("Cập nhật ảnh đại diện thành công.")
      } catch (error) {
        toast.error(getErrorMessage(error, "Tải ảnh thất bại. Vui lòng thử lại."))
      } finally {
        setIsUploadingAvatar(false)
      }
    })
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-10 sm:px-4 sm:py-8">
      <div className="space-y-4 sm:space-y-5">
        <Card className="overflow-hidden border-border/70 max-sm:rounded-none max-sm:border-x-0">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
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
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border bg-background shadow transition hover:bg-muted active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cập nhật ảnh đại diện"
              >
                {isUploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                <BadgeCheck className="size-5 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{profileData?.email ?? "—"}</p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", getReputationBadgeClass(reputationScore))}>
                  <ShieldCheck className="size-3.5" />
                  Điểm uy tín {reputationScore}/100
                </span>
                {userRoles.map((role) => (
                  <span key={role} className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          <Card className="max-sm:rounded-none max-sm:border-x-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="size-5 text-foreground" />
                Chi tiết tài khoản
              </CardTitle>
              <CardDescription>Chạm biểu tượng bút để sửa từng mục</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EditableField
                icon={<User className="size-4" />}
                label="Họ và tên"
                value={profileData?.full_name}
                placeholder="Nhập họ và tên"
                disabled={updateProfileMutation.isPending}
                onSave={(next) => saveBasic({ full_name: next })}
              />
              <InfoRow icon={<Mail className="size-4" />} label="Email" value={profileData?.email ?? "—"} />
              <EditableField
                icon={<Phone className="size-4" />}
                label="Số điện thoại"
                value={profileData?.phone}
                placeholder="Nhập số điện thoại"
                inputType="tel"
                disabled={updateProfileMutation.isPending}
                onSave={(next) => saveBasic({ phone: next })}
              />
            </CardContent>
          </Card>

          <Card className="max-sm:rounded-none max-sm:border-x-0">
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
              <InfoRow
                icon={<ShieldCheck className="size-4" />}
                label="Điểm uy tín"
                value={
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", getReputationBadgeClass(reputationScore))}>
                    {reputationScore}/100
                  </span>
                }
              />
              <InfoRow icon={<User className="size-4" />} label="ID người dùng" value={profileData?.id ?? "—"} />
            </CardContent>
          </Card>
        </div>

        <Card className="max-sm:rounded-none max-sm:border-x-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="size-5 text-foreground" />
              Bảo mật
            </CardTitle>
            <CardDescription>Đổi mật khẩu đăng nhập của bạn</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <PasswordEditRow
              disabled={updateProfileMutation.isPending}
              onSave={savePassword}
            />
          </CardContent>
        </Card>

        <Card className="max-sm:rounded-none max-sm:border-x-0">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="size-5 text-foreground" />
                Gói thành viên
              </CardTitle>
              <CardDescription>Gói hiện tại và thời hạn hiệu lực của bạn</CardDescription>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toPlanColor(profileData?.meta_data?.pricing_plan_code ?? undefined)}`}>
              {profileData?.meta_data?.pricing_plan_code ?? "standard"}
            </span>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Bắt đầu gói
              </p>
              <p className="font-medium">{formatDateTime(profileData?.meta_data?.pricing_started_at ?? undefined)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Hết hạn gói
              </p>
              <p className="font-medium">{formatDateTime(profileData?.meta_data?.pricing_expires_at ?? undefined)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ImageEditorDialog
        file={avatarEditor.currentFile}
        aspect={1}
        onConfirm={avatarEditor.confirm}
        onCancel={avatarEditor.cancel}
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
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="min-w-0 break-all text-right font-medium">{value}</div>
    </div>
  )
}

/** Một field sửa được tại chỗ: hiển thị giá trị + nút bút; bấm vào để sửa ngay. */
function EditableField({
  icon,
  label,
  value,
  placeholder,
  inputType = "text",
  onSave,
  disabled,
}: {
  icon: ReactNode
  label: string
  value: string | null | undefined
  placeholder?: string
  inputType?: string
  onSave: (next: string | null) => Promise<boolean>
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)

  const cancel = () => {
    setEditing(false)
    setDraft(value ?? "")
  }

  const save = async () => {
    if (saving) return
    const trimmed = draft.trim()
    if (trimmed === (value ?? "").trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(trimmed ? trimmed : null)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (editing) {
    return (
      <div className="border-b pb-3 last:border-b-0 last:pb-0">
        <div className="mb-1.5 flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            type={inputType}
            placeholder={placeholder}
            autoFocus
            disabled={saving}
            className="h-10 text-base"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void save()
              } else if (event.key === "Escape") {
                cancel()
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0"
            onClick={() => void save()}
            disabled={saving}
            aria-label="Lưu"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 shrink-0"
            onClick={cancel}
            disabled={saving}
            aria-label="Hủy"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{value || "—"}</span>
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? "")
            setEditing(true)
          }}
          disabled={disabled}
          aria-label={`Sửa ${label}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 disabled:opacity-50"
        >
          <PencilLine className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Đổi mật khẩu tại chỗ — mở rộng inline thay vì mở modal. */
function PasswordEditRow({
  onSave,
  disabled,
}: {
  onSave: (oldPassword: string, newPassword: string) => Promise<boolean>
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setOldPassword("")
    setNewPassword("")
    setShowOld(false)
    setShowNew(false)
  }
  const cancel = () => {
    setEditing(false)
    reset()
  }
  const canSave = oldPassword.length > 0 && newPassword.length >= 8 && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const ok = await onSave(oldPassword, newPassword)
    setSaving(false)
    if (ok) {
      setEditing(false)
      reset()
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <KeyRound className="size-4" />
          <span>Mật khẩu</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium tracking-widest">••••••••</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={disabled}
            aria-label="Đổi mật khẩu"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90 disabled:opacity-50"
          >
            <PencilLine className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-muted-foreground">Mật khẩu hiện tại</span>
        <InputGroup className="h-10">
          <InputGroupInput
            type={showOld ? "text" : "password"}
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            maxLength={128}
            className="text-base"
          />
          <InputGroupAddon>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowOld((prev) => !prev)}
              aria-label={showOld ? "Ẩn mật khẩu cũ" : "Hiện mật khẩu cũ"}
            >
              {showOld ? <EyeOff /> : <Eye />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="space-y-1.5">
        <span className="text-muted-foreground">Mật khẩu mới</span>
        <InputGroup className="h-10">
          <InputGroupInput
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            className="text-base"
          />
          <InputGroupAddon>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
            >
              {showNew ? <EyeOff /> : <Eye />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <PasswordStrengthChecklist password={newPassword} title="Yêu cầu mật khẩu mới" />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={cancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="button" onClick={() => void save()} disabled={!canSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Lưu mật khẩu
        </Button>
      </div>
    </div>
  )
}
