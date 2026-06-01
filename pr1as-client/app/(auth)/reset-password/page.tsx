"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AuthHeader } from "@/components/auth/auth-header"
import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isPasswordStrong } from "@/lib/auth/password.utils"
import { useResetPassword } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import {
  getErrorMessage,
  localizeServerMessage,
} from "@/lib/utils/error-handler"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetPasswordMutation = useResetPassword()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  // Capture the token from the URL on first render, then immediately clean the
  // URL so the token is not stored in browser history or leaked via Referer headers.
  const [tokenFromQuery] = useState(() => searchParams?.get("token") ?? "")

  const [tokenInput, setTokenInput] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const passwordMeetsAllRules = useMemo(
    () => isPasswordStrong(password),
    [password]
  )

  useEffect(() => {
    if (tokenFromQuery) {
      router.replace("/reset-password", { scroll: false })
    }
  }, [router, tokenFromQuery])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!passwordMeetsAllRules) {
      setErrorMessage("Mật khẩu chưa đáp ứng đủ điều kiện bảo mật.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.")
      return
    }

    const token = tokenFromQuery || tokenInput

    try {
      const response = await resetPasswordMutation.mutateAsync({
        token,
        password,
      })
      if (!response.success) {
        setErrorMessage(
          localizeServerMessage(response.message, "Đặt lại mật khẩu thất bại.")
        )
        return
      }

      toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.")
      clearAuth()
      setIsSuccess(true)
      window.setTimeout(() => router.push("/login"), 1800)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Không thể đặt lại mật khẩu. Vui lòng thử lại.")
      )
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AuthHeader
        title="Đặt lại mật khẩu"
        subtitle={
          isSuccess
            ? "Thành công! Đang chuyển về trang đăng nhập..."
            : "Nhập mã đặt lại và mật khẩu mới để hoàn tất."
        }
        mark={
          isSuccess ? (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-7" />
            </div>
          ) : undefined
        }
        className="pb-8 pt-6 sm:pt-2"
      />

      <div className="flex flex-1 flex-col gap-4">
        {!isSuccess ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="token">Mã đặt lại</Label>
              <Input
                id="token"
                value={tokenFromQuery || tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                disabled={Boolean(tokenFromQuery)}
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                  className="h-11 pr-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={
                    showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                  }
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                  className="h-11 pr-10 text-base"
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
            <PasswordStrengthChecklist password={password} />

            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Đặt lại mật khẩu
            </Button>
          </form>
        ) : null}

        {!tokenFromQuery && !tokenInput && !isSuccess ? (
          <Alert>
            <AlertTitle>Lưu ý</AlertTitle>
            <AlertDescription>
              Bạn có thể dán mã đặt lại được gửi qua email vào ô phía trên.
            </AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
