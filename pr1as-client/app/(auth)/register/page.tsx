"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, ShieldPlus, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useRegister } from "@/lib/hooks/use-auth"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"

const passwordRules = [
  { label: "Ít nhất 8 ký tự", test: (value: string) => value.length >= 8 },
  { label: "Có chữ hoa", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Có chữ thường", test: (value: string) => /[a-z]/.test(value) },
  { label: "Có số", test: (value: string) => /[0-9]/.test(value) },
  { label: "Có ký tự đặc biệt", test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
]

export default function RegisterPage() {
  const router = useRouter()
  const registerMutation = useRegister()

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const passwordMeetsAllRules = useMemo(() => passwordRules.every((rule) => rule.test(password)), [password])

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

    try {
      const response = await registerMutation.mutateAsync({
        email,
        password,
        full_name: fullName || undefined,
        phone: phone || undefined,
      })

      if (!response.success) {
        setErrorMessage(response.message ?? "Đăng ký thất bại.")
        return
      }

      router.push(`/verify-email?email=${encodeURIComponent(normalizeEmail(email))}`)
    } catch {
      setErrorMessage("Không thể đăng ký tài khoản. Vui lòng thử lại.")
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <ShieldPlus className="mx-auto mb-2 size-10 text-primary" />
        <CardTitle>Đăng ký tài khoản</CardTitle>
        <CardDescription>Tạo tài khoản mới để bắt đầu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-name">Họ và tên</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium">Yêu cầu mật khẩu:</p>
            <ul className="space-y-1 text-muted-foreground">
              {passwordRules.map((rule) => {
                const isMet = rule.test(password)
                return (
                  <li key={rule.label} className="flex items-center gap-2">
                    {isMet ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-muted-foreground" />}
                    <span>{rule.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Đăng ký
          </Button>
        </form>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Separator />

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
