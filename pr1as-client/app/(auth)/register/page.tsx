"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeOff, Loader2, MailCheck, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useRegister } from "@/lib/hooks/use-auth"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { isPasswordStrong, passwordRules } from "@/lib/auth/password.utils"
import { getErrorMessage } from "@/lib/utils/error-handler"

export default function RegisterPage() {
  const router = useRouter()
  const registerMutation = useRegister()

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")

  const passwordMeetsAllRules = useMemo(
    () => isPasswordStrong(password),
    [password]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!passwordMeetsAllRules) {
      toast.error("Mật khẩu chưa đáp ứng đủ điều kiện bảo mật.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.")
      return
    }

    const normalizedEmail = normalizeEmail(email)
    const trimmedFullName = fullName.trim()
    const trimmedPhone = phone.trim()

    try {
      const response = await registerMutation.mutateAsync({
        email: normalizedEmail,
        password,
        full_name: trimmedFullName || undefined,
        phone: trimmedPhone || undefined,
      })

      if (!response.success) {
        toast.error(response.message ?? "Đăng ký thất bại.")
        return
      }

      setRegisteredEmail(normalizedEmail)
      setPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setShowConfirmPassword(false)
      setShowSuccessPopup(true)
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Không thể đăng ký tài khoản. Vui lòng thử lại.")
      )
    }
  }

  return (
    <>
      {showSuccessPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="size-7 text-primary" />
              </div>
            </div>
            <h2 className="mb-2 text-center text-lg font-semibold">
              Đăng ký thành công!
            </h2>
            <p className="mb-1 text-center text-sm text-muted-foreground">
              Vui lòng xác nhận email đã đăng ký:
            </p>
            <p className="mb-5 text-center text-sm font-medium break-all text-primary">
              {registeredEmail}
            </p>
            <p className="mb-5 text-center text-xs text-muted-foreground">
              Kiểm tra hộp thư đến (hoặc thư mục spam) và nhấp vào đường dẫn xác
              nhận trước khi đăng nhập.
            </p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Đến trang đăng nhập
            </Button>
          </div>
        </div>
      ) : null}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>ĐĂNG KÍ TÀI KHOẢN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                maxLength={254}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Họ và tên</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn mật khẩu xác nhận"
                      : "Hiện mật khẩu xác nhận"
                  }
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Yêu cầu mật khẩu:</p>

              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                {passwordRules.map((rule) => {
                  const isMet = rule.test(password)
                  return (
                    <li key={rule.label} className="flex items-center gap-2">
                      {isMet ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <X className="size-4 text-muted-foreground" />
                      )}
                      <span>{rule.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Đăng ký
            </Button>
          </form>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
