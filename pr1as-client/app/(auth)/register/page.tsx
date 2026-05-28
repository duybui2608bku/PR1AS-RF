"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { isPasswordStrong } from "@/lib/auth/password.utils"
import { useRegister } from "@/lib/hooks/use-auth"
import {
  getErrorMessage,
  localizeServerMessage,
} from "@/lib/utils/error-handler"

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
        toast.error(
          localizeServerMessage(response.message, "Đăng ký thất bại.")
        )
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
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-7 text-primary" />
            </div>
            <DialogTitle>Đăng ký thành công</DialogTitle>
            <DialogDescription>
              Vui lòng xác nhận email đã đăng ký trước khi đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm font-medium break-all text-primary">
            {registeredEmail}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Đến trang đăng nhập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Đăng ký tài khoản</CardTitle>
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
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  maxLength={254}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="full-name">Họ và tên</FieldLabel>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={32}
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
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                  <InputGroupAddon>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Xác nhận mật khẩu
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                  <InputGroupAddon>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
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
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <PasswordStrengthChecklist password={password} />
              </Field>
            </FieldGroup>
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="animate-spin" />
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
