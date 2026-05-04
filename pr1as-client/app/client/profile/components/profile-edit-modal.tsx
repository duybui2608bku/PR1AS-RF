"use client"

import { FormEvent, useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Phone, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ProfileEditModalProps = {
  open: boolean
  initialFullName?: string | null
  initialPhone?: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: { full_name: string | null; phone: string | null; old_password?: string; password?: string }) => Promise<void>
}

export function ProfileEditModal({
  open,
  initialFullName,
  initialPhone,
  isSubmitting,
  onClose,
  onSubmit,
}: ProfileEditModalProps) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    if (!open) return
    setFullName(initialFullName ?? "")
    setPhone(initialPhone ?? "")
    setOldPassword("")
    setNewPassword("")
    setShowOldPassword(false)
    setShowNewPassword(false)
  }, [open, initialFullName, initialPhone])

  if (!open) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      full_name: fullName || null,
      phone: phone || null,
      old_password: oldPassword || undefined,
      password: newPassword || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">Cập nhật hồ sơ</h2>
            <p className="text-sm text-muted-foreground">Chỉnh sửa thông tin cá nhân và mật khẩu (nếu cần)</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nhập họ và tên"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nhập số điện thoại"
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="old_password">Mật khẩu cũ</Label>
              <div className="relative">
                <Input
                  id="old_password"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                >
                  {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
