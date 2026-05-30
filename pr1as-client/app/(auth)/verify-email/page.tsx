"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react"

import { AuthHeader } from "@/components/auth/auth-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { useResendVerification, useVerifyEmail } from "@/lib/hooks/use-auth"
import { getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"

type VerifyStatus = "loading" | "success" | "error" | "no-token"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verifyEmailMutation = useVerifyEmail()
  const resendVerificationMutation = useResendVerification()

  // Capture token and email from the URL immediately, then clean
  // the URL so these values are not stored in browser history or leaked via
  // the Referer header when the page loads external resources.
  const [tokenFromQuery] = useState(() => searchParams?.get("token") ?? "")
  const [initialEmail] = useState(() => searchParams?.get("email") ?? "")

  const [email, setEmail] = useState(() => normalizeEmail(initialEmail))
  const [status, setStatus] = useState<VerifyStatus>(() => tokenFromQuery ? "loading" : "no-token")
  const [message, setMessage] = useState<string | null>(null)
  const hasVerifiedRef = useRef(false)

  useEffect(() => {
    if (tokenFromQuery || initialEmail) {
      router.replace("/verify-email", { scroll: false })
    }
  }, [initialEmail, router, tokenFromQuery])

  useEffect(() => {
    const token = tokenFromQuery
    if (!token || hasVerifiedRef.current) {
      return
    }

    hasVerifiedRef.current = true
    void (async () => {
      try {
        const response = await verifyEmailMutation.mutateAsync({ token })
        setStatus(response.success ? "success" : "error")
      } catch {
        setStatus("error")
      }
    })()
  }, [tokenFromQuery, verifyEmailMutation])

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      const response = await resendVerificationMutation.mutateAsync({ email })
      setMessage(
        response.success
          ? "Đã gửi lại email xác minh."
          : localizeServerMessage(response.message, "Gửi email thất bại.")
      )
    } catch (error) {
      setMessage(getErrorMessage(error, "Không thể gửi lại email xác minh."))
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AuthHeader
        title="Xác minh email"
        subtitle={
          status === "loading"
            ? "Đang xác minh tài khoản..."
            : status === "success"
              ? "Xác minh thành công."
              : status === "error"
                ? "Xác minh thất bại hoặc link đã hết hạn."
                : "Không tìm thấy token xác minh. Bạn có thể gửi lại email."
        }
        mark={
          status === "success" ? (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-7" />
            </div>
          ) : status === "error" ? (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="size-7" />
            </div>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="size-7" />
            </div>
          )
        }
        className="pb-8 pt-6 sm:pt-2"
      />

      <div className="flex flex-1 flex-col gap-4">
        {status === "loading" ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : null}

        {status === "success" ? (
          <Button
            className="h-11 w-full text-base"
            onClick={() => router.push("/login")}
          >
            Đi đến đăng nhập
          </Button>
        ) : (
          <form className="space-y-4" onSubmit={handleResend}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 text-base"
              />
            </div>

            <Button
              className="h-11 w-full text-base"
              type="submit"
              disabled={resendVerificationMutation.isPending}
            >
              {resendVerificationMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Gửi lại email xác minh
            </Button>
          </form>
        )}

        {message ? (
          <Alert>
            <AlertTitle>Thông báo</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
