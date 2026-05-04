"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { useResendVerification, useVerifyEmail } from "@/lib/hooks/use-auth"
import { getErrorMessage } from "@/lib/utils/error-handler"

type VerifyStatus = "loading" | "success" | "error" | "no-token"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verifyEmailMutation = useVerifyEmail()
  const resendVerificationMutation = useResendVerification()
  const token = searchParams?.get("token") ?? ""
  const initialEmail = searchParams?.get("email") ?? ""

  const [email, setEmail] = useState(normalizeEmail(initialEmail))
  const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "no-token")
  const [message, setMessage] = useState<string | null>(null)
  const hasVerifiedRef = useRef(false)

  useEffect(() => {
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
  }, [token, verifyEmailMutation])

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    try {
      const response = await resendVerificationMutation.mutateAsync({ email })
      setMessage(response.success ? "Đã gửi lại email xác minh." : response.message ?? "Gửi email thất bại.")
    } catch (error) {
      setMessage(getErrorMessage(error, "Không thể gửi lại email xác minh."))
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        {status === "success" ? (
          <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-600" />
        ) : status === "error" ? (
          <XCircle className="mx-auto mb-2 size-10 text-destructive" />
        ) : (
          <Mail className="mx-auto mb-2 size-10 text-primary" />
        )}
        <CardTitle>Xác minh email</CardTitle>
        <CardDescription>
          {status === "loading"
            ? "Đang xác minh tài khoản..."
            : status === "success"
              ? "Xác minh thành công."
              : status === "error"
                ? "Xác minh thất bại hoặc link đã hết hạn."
                : "Không tìm thấy token xác minh. Bạn có thể gửi lại email."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : null}

        {status === "success" ? (
          <Button className="w-full" onClick={() => router.push("/login")}>
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
              />
            </div>

            <Button className="w-full" type="submit" disabled={resendVerificationMutation.isPending}>
              {resendVerificationMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
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

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
