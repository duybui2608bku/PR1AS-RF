"use client"

import { FormEvent, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, Loader2, Phone, User } from "lucide-react"
import { toast } from "sonner"

import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { isPasswordStrong } from "@/lib/auth/password.utils"

type ProfileEditModalProps = {
  open: boolean
  initialFullName?: string | null
  initialPhone?: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: {
    full_name: string | null
    phone: string | null
    old_password?: string
    password?: string
  }) => Promise<void>
}

export function ProfileEditModal({
  open,
  initialFullName,
  initialPhone,
  isSubmitting,
  onClose,
  onSubmit,
}: ProfileEditModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      {open ? (
        <ProfileEditModalContent
          key={`${initialFullName ?? ""}:${initialPhone ?? ""}`}
          initialFullName={initialFullName}
          initialPhone={initialPhone}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}

function ProfileEditModalContent({
  initialFullName,
  initialPhone,
  isSubmitting,
  onClose,
  onSubmit,
}: Omit<ProfileEditModalProps, "open">) {
  const t = useTranslations("ClientProfile")
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [phone, setPhone] = useState(initialPhone ?? "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const newPasswordMeetsAllRules = useMemo(
    () => isPasswordStrong(newPassword),
    [newPassword]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword && !newPasswordMeetsAllRules) {
      toast.error(t("toast.passwordWeak"))
      return
    }

    await onSubmit({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      old_password: oldPassword || undefined,
      password: newPassword || undefined,
    })
  }

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{t("modal.title")}</DialogTitle>
        <DialogDescription>
          {t("modal.description")}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="full_name">{t("fields.fullName")}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <User />
              </InputGroupAddon>
              <InputGroupInput
                id="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t("placeholders.fullName")}
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">{t("fields.phone")}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Phone />
              </InputGroupAddon>
              <InputGroupInput
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t("placeholders.phone")}
              />
            </InputGroup>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="old_password">{t("fields.currentPassword")}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="old_password"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  placeholder="••••••••"
                  maxLength={128}
                  autoComplete="current-password"
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowOldPassword((previous) => !previous)}
                    aria-label={
                      showOldPassword ? t("actions.hideCurrentPassword") : t("actions.showCurrentPassword")
                    }
                  >
                    {showOldPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="new_password">{t("fields.newPassword")}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    aria-label={
                      showNewPassword ? t("actions.hideNewPassword") : t("actions.showNewPassword")
                    }
                  >
                    {showNewPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          <Field>
            <PasswordStrengthChecklist
              password={newPassword}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {t("actions.saveChanges")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
