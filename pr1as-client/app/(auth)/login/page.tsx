"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { AuthHeader } from "@/components/auth/auth-header"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { GoogleLogin } from "@react-oauth/google"
import { isEmailNotVerifiedError } from "@/lib/auth/auth-error.utils"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { getActiveRole } from "@/lib/auth/roles"
import { useForgotPassword, useGoogleLogin, useLogin, useMe, useResendVerification } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { ApiError, getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Auth")
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const loginMutation = useLogin()
  const googleLoginMutation = useGoogleLogin()
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
  const authenticatedUser = meQuery.data?.data?.user ?? user
  const activeRole = getActiveRole(authenticatedUser)
  const isAdminActive = activeRole === "admin"
  const fromPath = searchParams.get("from")
  const safeFrom =
    fromPath?.startsWith("/") && !fromPath.startsWith("//") ? fromPath : null
  const allowedSafeFrom =
    safeFrom?.startsWith("/dashboard") && !isAdminActive ? null : safeFrom
  const defaultRedirectTarget =
    activeRole === "client"
      ? "/services"
      : activeRole === "worker"
        ? "/posts"
        : "/about"
  const safeRedirectTarget = allowedSafeFrom === "/" ? null : allowedSafeFrom
  const redirectTarget =
    authenticatedUser && isAdminActive
      ? (safeRedirectTarget ?? "/dashboard")
      : (safeRedirectTarget ?? defaultRedirectTarget)

  // Lưu ý: KHÔNG clearAuth khi meQuery lỗi — lỗi network thoáng qua trên mobile
  // từng khiến user bị logout oan. 401 thật đã được axios interceptor xử lý
  // (refresh token hoặc force logout).

  // Điều hướng ngay khi store đã authenticated — sau Lớp 2, isAuthenticated=true
  // đồng nghĩa httpOnly cookie đã được set thành công, không cần chờ /auth/me.
  useEffect(() => {
    if (isSessionActive && authenticatedUser) {
      router.replace(redirectTarget)
    }
  }, [isSessionActive, authenticatedUser, redirectTarget, router])

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
        toast.error(localizeServerMessage(response.message, t("loginFailed")))
        return
      }

      setPassword("")
      setShowPassword(false)
      toast.success(t("loginSuccess"))
    } catch (error) {
      if (isEmailNotVerifiedError(error)) {
        setPendingVerificationEmail(normalizedEmail)
        toast.warning(t("emailNotVerified"))
        return
      }

      if (error instanceof ApiError && error.code === "ACCOUNT_LOCKED") {
        const minutes = error.retryAfter
          ? Math.max(1, Math.ceil(error.retryAfter / 60))
          : 30
        toast.error(t("accountLocked", { minutes }))
        return
      }

      toast.error(getErrorMessage(error, t("loginError")))
    }
  }

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return

    try {
      await resendVerificationMutation.mutateAsync({
        email: pendingVerificationEmail,
      })
      toast.success(t("resendSuccess"))
    } catch (error) {
      toast.error(getErrorMessage(error, t("resendError")))
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
        toast.error(localizeServerMessage(response.message, t("forgotPasswordFailed")))
        return
      }

      toast.success(localizeServerMessage(response.message, t("forgotPasswordSuccess")))
    } catch (error) {
      toast.error(getErrorMessage(error, t("forgotPasswordError")))
    }
  }

  // Đang authenticated (vừa login xong, hoặc bị middleware đá về đây trong lúc
  // token đang được silent-refresh) → hiển thị loading thay vì form login để
  // tránh "chớp form" gây cảm giác bị logout; effect phía trên sẽ tự điều hướng.
  if (isSessionActive) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <AuthHeader
        title={t("loginTitle")}
        subtitle={t("loginSubtitle")}
        className="pb-8 pt-6 sm:pt-2"
      />

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
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
              className="h-11 text-base"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <InputGroup className="h-11">
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
                className="text-base"
              />
              <InputGroupAddon>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
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
                {t("forgotPassword")}
              </Button>
            </div>
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          className="h-11 w-full text-base"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : null}
          {t("loginButton")}
        </Button>
      </form>

      {pendingVerificationEmail ? (
        <Button
          variant="outline"
          className="mt-4 h-11 w-full text-base"
          onClick={handleResendVerification}
          disabled={resendVerificationMutation.isPending}
        >
          {resendVerificationMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : null}
          {t("resendVerification")}
        </Button>
      ) : null}

      <Separator className="my-2" />
      <div className="relative h-11 w-full">
        <Button
          type="button"
          variant="outline"
          className="pointer-events-none h-11 w-full text-base"
          tabIndex={-1}
          aria-hidden="true"
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
          {t("loginWithGoogle")}
        </Button>
        <div
          className="absolute inset-0 overflow-hidden opacity-0"
          aria-hidden="true"
          style={{ pointerEvents: googleLoginMutation.isPending ? "none" : "auto" }}
        >
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) {
                toast.error(t("googleLoginFailed"))
                return
              }
              try {
                const response = await googleLoginMutation.mutateAsync(credentialResponse.credential)
                if (!response.success) {
                  toast.error(localizeServerMessage(response.message, t("googleLoginFailed")))
                  return
                }
                toast.success(t("loginSuccess"))
              } catch (error) {
                toast.error(getErrorMessage(error, t("googleLoginError")))
              }
            }}
            onError={() => toast.error(t("googleLoginFailed"))}
            width="500"
            size="large"
            text="signin_with"
          />
        </div>
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>
    </div>
  )
}
