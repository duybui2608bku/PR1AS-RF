"use client"

import { ChangeEvent, ReactNode, useRef, useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
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
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { getReputationBadgeClass, getReputationScore } from "@/lib/utils/reputation"
import { uploadImage } from "@/lib/utils/upload-image"
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "@/lib/utils/validate-upload"

const formatDateTime = (value: string | null | undefined, localeTag: string): string => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(localeTag)
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
  const t = useTranslations("ClientProfile")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale]
  const user = useAuthStore((s) => s.user)
  const meQuery = useMe()
  const updateProfileMutation = useUpdateBasicProfile()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarEditor = useImageEditorQueue()

  const profileData = meQuery.data?.data?.user ?? user
  const userRoles = profileData?.roles ?? []
  const displayName = profileData?.full_name ?? t("userFallback")
  const reputationScore = getReputationScore(profileData?.meta_data?.reputation_score)

  // Lưu một field cơ bản (tên / sđt). API cập nhật từng phần nên chỉ gửi field đổi.
  const saveBasic = async (payload: {
    full_name?: string | null
    phone?: string | null
  }): Promise<boolean> => {
    try {
      const response = await updateProfileMutation.mutateAsync(payload)
      if (!response.success) {
        toast.error(localizeServerMessage(response.message, t("toast.updateFailed")))
        return false
      }
      toast.success(t("toast.updateSuccess"))
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, t("toast.updateError")))
      return false
    }
  }

  const savePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    if (!isPasswordStrong(newPassword)) {
      toast.error(t("toast.passwordWeak"))
      return false
    }
    try {
      const response = await updateProfileMutation.mutateAsync({
        old_password: oldPassword,
        password: newPassword,
      })
      if (!response.success) {
        toast.error(localizeServerMessage(response.message, t("toast.passwordFailed")))
        return false
      }
      toast.success(t("toast.passwordSuccess"))
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, t("toast.passwordError")))
      return false
    }
  }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      toast.error(t("toast.invalidAvatarType"))
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t("toast.avatarTooLarge", { max: MAX_IMAGE_SIZE_MB }))
      return
    }
    avatarEditor.start([file], async ([croppedFile]) => {
      try {
        setIsUploadingAvatar(true)
        const avatarUrl = await uploadImage(croppedFile)
        const response = await updateProfileMutation.mutateAsync({ avatar: avatarUrl })
        if (!response.success) {
          toast.error(localizeServerMessage(response.message, t("toast.avatarFailed")))
          return
        }
        toast.success(t("toast.avatarSuccess"))
      } catch (error) {
        toast.error(getErrorMessage(error, t("toast.avatarUploadError")))
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
                aria-label={t("avatarAria")}
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
                  {t("reputation", { score: reputationScore })}
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
                {t("accountDetails.title")}
              </CardTitle>
              <CardDescription>{t("accountDetails.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EditableField
                icon={<User className="size-4" />}
                label={t("fields.fullName")}
                value={profileData?.full_name}
                placeholder={t("placeholders.fullName")}
                disabled={updateProfileMutation.isPending}
                onSave={(next) => saveBasic({ full_name: next })}
              />
              <InfoRow icon={<Mail className="size-4" />} label={t("fields.email")} value={profileData?.email ?? "—"} />
              <EditableField
                icon={<Phone className="size-4" />}
                label={t("fields.phone")}
                value={profileData?.phone}
                placeholder={t("placeholders.phone")}
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
                {t("status.title")}
              </CardTitle>
              <CardDescription>{t("status.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                icon={<ShieldCheck className="size-4" />}
                label={t("fields.status")}
                value={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toStatusColor(profileData?.status)}`}>
                    {profileData?.status?.toLowerCase() === "active" ? t("status.active") : profileData?.status ?? t("status.unknown")}
                  </span>
                }
              />
              <InfoRow
                icon={<BadgeCheck className="size-4" />}
                label={t("fields.emailVerified")}
                value={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toVerifyColor(profileData?.verify_email)}`}>
                    {profileData?.verify_email ? t("status.verified") : t("status.unverified")}
                  </span>
                }
              />
              <InfoRow
                icon={<User className="size-4" />}
                label={t("fields.lastActiveRole")}
                value={profileData?.last_active_role ?? "—"}
              />
              <InfoRow
                icon={<ShieldCheck className="size-4" />}
                label={t("fields.reputationScore")}
                value={
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", getReputationBadgeClass(reputationScore))}>
                    {reputationScore}/100
                  </span>
                }
              />
              <InfoRow icon={<User className="size-4" />} label={t("fields.userId")} value={profileData?.id ?? "—"} />
            </CardContent>
          </Card>
        </div>

        <Card className="max-sm:rounded-none max-sm:border-x-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="size-5 text-foreground" />
              {t("security.title")}
            </CardTitle>
            <CardDescription>{t("security.description")}</CardDescription>
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
                {t("plan.title")}
              </CardTitle>
              <CardDescription>{t("plan.description")}</CardDescription>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toPlanColor(profileData?.meta_data?.pricing_plan_code ?? undefined)}`}>
              {profileData?.meta_data?.pricing_plan_code ?? "standard"}
            </span>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t("plan.startedAt")}
              </p>
              <p className="font-medium">{formatDateTime(profileData?.meta_data?.pricing_started_at, localeTag)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t("plan.expiresAt")}
              </p>
              <p className="font-medium">{formatDateTime(profileData?.meta_data?.pricing_expires_at, localeTag)}</p>
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
  const t = useTranslations("ClientProfile")
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
            aria-label={t("actions.save")}
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
            aria-label={t("actions.cancel")}
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
          aria-label={t("actions.editField", { label })}
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
  const t = useTranslations("ClientProfile")
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
          <span>{t("fields.password")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium tracking-widest">••••••••</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={disabled}
            aria-label={t("actions.changePassword")}
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
        <span className="text-muted-foreground">{t("fields.currentPassword")}</span>
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
              aria-label={showOld ? t("actions.hideCurrentPassword") : t("actions.showCurrentPassword")}
            >
              {showOld ? <EyeOff /> : <Eye />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="space-y-1.5">
        <span className="text-muted-foreground">{t("fields.newPassword")}</span>
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
              aria-label={showNew ? t("actions.hideNewPassword") : t("actions.showNewPassword")}
            >
              {showNew ? <EyeOff /> : <Eye />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <PasswordStrengthChecklist password={newPassword} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={cancel} disabled={saving}>
          {t("actions.cancel")}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={!canSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("actions.savePassword")}
        </Button>
      </div>
    </div>
  )
}
