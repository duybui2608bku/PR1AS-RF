"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useLogin, useMe, useResendVerification } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { isEmailNotVerifiedError } from "@/lib/auth/auth-error.utils"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { getErrorMessage } from "@/lib/utils/error-handler"

export default function LoginPage() {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const loginMutation = useLogin()
  const resendVerificationMutation = useResendVerification()
  const meQuery = useMe()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  const isSessionActive = Boolean(token && isAuthenticated)
  const meSucceeded = meQuery.isSuccess && meQuery.data?.success === true
  const authenticatedUser = meQuery.data?.data?.user ?? user
  const redirectTarget = authenticatedUser?.role === "admin" ? "/dashboard" : "/"

  useEffect(() => {
    if (isSessionActive && meQuery.isError) {
      clearAuth()
    }
  }, [isSessionActive, meQuery.isError, clearAuth])

  useEffect(() => {
    if (isSessionActive && meSucceeded && authenticatedUser) {
      router.replace(redirectTarget)
    }
  }, [isSessionActive, meSucceeded, authenticatedUser, redirectTarget, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPendingVerificationEmail(null)

    try {
      const response = await loginMutation.mutateAsync({
        email,
        password,
      })

      if (!response.success) {
        toast.error(response.message ?? "Đăng nhập thất bại.")
        return
      }

      toast.success("Đăng nhập thành công.")
    } catch (error) {
      if (isEmailNotVerifiedError(error)) {
        setPendingVerificationEmail(normalizeEmail(email))
        toast.warning("Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác minh.")
        return
      }

      toast.error(getErrorMessage(error, "Không thể đăng nhập. Vui lòng thử lại."))
    }
  }

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) {
      return
    }

    try {
      await resendVerificationMutation.mutateAsync({ email: pendingVerificationEmail })
      toast.success("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.")
    } catch (error) {
      toast.error(getErrorMessage(error, "Gửi lại email xác minh thất bại. Vui lòng thử lại."))
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <ShieldCheck className="mx-auto mb-2 size-10 text-primary" />
        <CardTitle>ĐĂNG NHẬP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                minLength={8}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Đăng nhập
          </Button>
        </form>

        {pendingVerificationEmail ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendVerification}
            disabled={resendVerificationMutation.isPending}
          >
            {resendVerificationMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Gửi lại email xác minh
          </Button>
        ) : null}

        <Separator />

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Đăng ký
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
