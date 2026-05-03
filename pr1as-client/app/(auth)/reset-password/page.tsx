"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useResetPassword } from "@/lib/hooks/use-auth"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetPasswordMutation = useResetPassword()
  const tokenFromQuery = searchParams?.get("token") ?? ""

  const [tokenInput, setTokenInput] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (password.length < 8) {
      setErrorMessage("Mật khẩu cần tối thiểu 8 ký tự.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.")
      return
    }

    const token = tokenFromQuery || tokenInput

    try {
      const response = await resetPasswordMutation.mutateAsync({ token, password })
      if (!response.success) {
        setErrorMessage(response.message ?? "Đặt lại mật khẩu thất bại.")
        return
      }

      setIsSuccess(true)
      window.setTimeout(() => router.push("/login"), 1800)
    } catch {
      setErrorMessage("Không thể đặt lại mật khẩu. Vui lòng thử lại.")
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        {isSuccess ? (
          <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-600" />
        ) : (
          <ShieldCheck className="mx-auto mb-2 size-10 text-primary" />
        )}
        <CardTitle>Đặt lại mật khẩu</CardTitle>
        <CardDescription>
          {isSuccess ? "Thành công! Đang chuyển về trang đăng nhập..." : "Nhập mã đặt lại và mật khẩu mới để hoàn tất."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Đặt lại mật khẩu
            </Button>
          </form>
        ) : null}

        {!tokenFromQuery && !isSuccess ? (
          <Alert>
            <AlertTitle>Lưu ý</AlertTitle>
            <AlertDescription>Bạn có thể dán mã đặt lại được gửi qua email vào ô phía trên.</AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
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
