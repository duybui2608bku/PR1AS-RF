"use client"

import { FormEvent, useState } from "react"
import { Eye, EyeOff, Loader2, Phone, User } from "lucide-react"

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
  const [fullName, setFullName] = useState(initialFullName ?? "")
  const [phone, setPhone] = useState(initialPhone ?? "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
        <DialogTitle>Cập nhật hồ sơ</DialogTitle>
        <DialogDescription>
          Chỉnh sửa thông tin cá nhân và mật khẩu khi cần.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="full_name">Họ và tên</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <User />
              </InputGroupAddon>
              <InputGroupInput
                id="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nhập họ và tên"
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Phone />
              </InputGroupAddon>
              <InputGroupInput
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nhập số điện thoại"
              />
            </InputGroup>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="old_password">Mật khẩu cũ</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="old_password"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowOldPassword((previous) => !previous)}
                    aria-label={
                      showOldPassword ? "Ẩn mật khẩu cũ" : "Hiện mật khẩu cũ"
                    }
                  >
                    {showOldPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="new_password">Mật khẩu mới</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    aria-label={
                      showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                    }
                  >
                    {showNewPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
