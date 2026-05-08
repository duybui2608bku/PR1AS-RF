"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
import { useLogin, useMe, useResendVerification } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const loginMutation = useLogin()
  const resendVerificationMutation = useResendVerification()
  const meQuery = useMe()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null)

  const isSessionActive = Boolean(token && isAuthenticated)
  const meSucceeded = meQuery.isSuccess && meQuery.data?.success === true
  const authenticatedUser = meQuery.data?.data?.user ?? user
  const fromPath = searchParams.get("from")
  const safeFrom =
    fromPath?.startsWith("/") && !fromPath.startsWith("//") ? fromPath : null
  const redirectTarget =
    safeFrom ?? (authenticatedUser?.role === "admin" ? "/dashboard" : "/")

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
    const normalizedEmail = normalizeEmail(email)

    try {
      const response = await loginMutation.mutateAsync({
        email: normalizedEmail,
        password,
      })

      if (!response.success) {
        toast.error(response.message ?? "Đăng nhập thất bại.")
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
