"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useGoogleLogin as useGoogleOAuth } from "@react-oauth/google"
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { isEmailNotVerifiedError } from "@/lib/auth/auth-error.utils"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { getActiveRole, isWorkerRoleActive } from "@/lib/auth/roles"
import { useForgotPassword, useGoogleLogin, useLogin, useMe, useResendVerification } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const loginMutation = useLogin()
  const googleLoginMutation = useGoogleLogin()
  const triggerGoogleOAuth = useGoogleOAuth({
    onSuccess: async (tokenResponse) => {
      try {
        await googleLoginMutation.mutateAsync(tokenResponse.access_token)
        toast.success("Đăng nhập thành công.")
      } catch {
        toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.")
      }
    },
    onError: () => toast.error("Đăng nhập Google thất bại."),
  })
  const forgotPasswordMutation = useForgotPassword()
  const resendVerificationMutation = useResendVerification()
  const meQuery = useMe()

  const emailInputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null)

  const isSessionActive = isAuthenticated
  const meSucceeded = meQuery.isSuccess && meQuery.data?.success === true
  const authenticatedUser = meQuery.data?.data?.user ?? user
  const isWorker = authenticatedUser && isWorkerRoleActive(authenticatedUser)
  const activeRole = getActiveRole(authenticatedUser)
  const isAdminActive = activeRole === "admin"
  const fromPath = searchParams.get("from")
  const safeFrom =
    fromPath?.startsWith("/") && !fromPath.startsWith("//") ? fromPath : null
  const allowedSafeFrom =
    safeFrom?.startsWith("/dashboard") && !isAdminActive ? null : safeFrom
  const defaultRedirectTarget = isWorker ? "/posts" : "/"
  const safeRedirectTarget = isWorker && allowedSafeFrom === "/" ? null : allowedSafeFrom
  const redirectTarget =
    authenticatedUser && isAdminActive
      ? (safeRedirectTarget ?? "/dashboard")
      : (safeRedirectTarget ?? defaultRedirectTarget)

  useEffect(() => {
    if (isSessionActive && meQuery.isError) {
      void clearSessionCookie()
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
    const normalizedEmail = normalizeEmail(email)

    try {
      const response = await loginMutation.mutateAsync({
        email: normalizedEmail,
        password,
      })

      if (!response.success) {
        toast.error(localizeServerMessage(response.message, "Đăng nhập thất bại."))
        return
      }

      setPassword("")
      setShowPassword(false)
      toast.success("Đăng nhập thành công.")
    } catch (error) {
      if (isEmailNotVerifiedError(error)) {
        setPendingVerificationEmail(normalizedEmail)
        toast.warning(
          "Email chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc gửi lại email xác minh."
        )
        return
      }

      toast.error(
        getErrorMessage(error, "Không thể đăng nhập. Vui lòng thử lại.")
      )
    }
  }

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return

    try {
      await resendVerificationMutation.mutateAsync({
        email: pendingVerificationEmail,
      })
      toast.success("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.")
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Gửi lại email xác minh thất bại. Vui lòng thử lại."
        )
      )
    }
  }

  const handleForgotPassword = async () => {
    if (!emailInputRef.current?.checkValidity()) {
      emailInputRef.current?.reportValidity()
      emailInputRef.current?.focus()
      return
    }

    const normalizedEmail = normalizeEmail(email)

    try {
      const response = await forgotPasswordMutation.mutateAsync({
        email: normalizedEmail,
      })

      if (!response.success) {
        toast.error(
          localizeServerMessage(response.message, "Gửi email đặt lại mật khẩu thất bại.")
        )
        return
      }

      toast.success(
        localizeServerMessage(
          response.message,
          "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi."
        )
      )
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại."
        )
      )
    }
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <ShieldCheck className="size-10 text-primary" />
        <CardTitle>Đăng nhập</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                maxLength={254}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 py-0"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  Quên mật khẩu?
                </Button>
              </div>
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
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
            {resendVerificationMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Gửi lại email xác minh
          </Button>
        ) : null}

        <Separator />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => triggerGoogleOAuth()}
          disabled={googleLoginMutation.isPending}
        >
          {googleLoginMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Đăng nhập bằng Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
