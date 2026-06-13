"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { GoogleLogin } from "@react-oauth/google"
import { AuthHeader } from "@/components/auth/auth-header"
import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { isPasswordStrong } from "@/lib/auth/password.utils"
import { useGoogleLogin, useRegister } from "@/lib/hooks/use-auth"
import {
  getErrorMessage,
  localizeServerMessage,
} from "@/lib/utils/error-handler"

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const registerMutation = useRegister()
  const googleLoginMutation = useGoogleLogin()

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

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      toast.error(t("googleLoginFailed"))
      return
    }
    try {
      const response = await googleLoginMutation.mutateAsync(credential)
      if (!response.success) {
        toast.error(localizeServerMessage(response.message, t("googleLoginFailed")))
        return
      }
      toast.success(t("loginSuccess"))
      router.replace("/")
    } catch (error) {
      toast.error(getErrorMessage(error, t("googleLoginError")))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!passwordMeetsAllRules) {
      toast.error(t("passwordWeak"))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"))
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
        toast.error(localizeServerMessage(response.message, t("registerFailed")))
        return
      }

      setRegisteredEmail(normalizedEmail)
      setPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setShowConfirmPassword(false)
      setShowSuccessPopup(true)
    } catch (error) {
      toast.error(getErrorMessage(error, t("registerError")))
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
            <DialogTitle>{t("registerSuccess")}</DialogTitle>
            <DialogDescription>
              {t("registerSuccessDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm font-medium break-all text-primary">
            {registeredEmail}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => router.push("/login")}>
              {t("goToLogin")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col">
        <AuthHeader
          title={t("registerTitle")}
          subtitle={t("registerSubtitle")}
          className="pb-8 pt-6 sm:pt-2"
        />

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
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
                className="h-11 text-base"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="full-name">{t("fullName")}</FieldLabel>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                maxLength={120}
                className="h-11 text-base"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">{t("phone")}</FieldLabel>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={32}
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
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
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
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                {t("confirmPassword")}
              </FieldLabel>
              <InputGroup className="h-11">
                <InputGroupInput
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  className="text-base"
                />
                <InputGroupAddon>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                    aria-label={showConfirmPassword ? t("hideConfirmPassword") : t("showConfirmPassword")}
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field className="sm:col-span-2">
              <PasswordStrengthChecklist password={password} />
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            {t("registerButton")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {t("orContinueWith")}
          </span>
          <Separator className="flex-1" />
        </div>

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
            {t("registerWithGoogle")}
          </Button>
          <div
            className="absolute inset-0 overflow-hidden opacity-0"
            aria-hidden="true"
            style={{ pointerEvents: googleLoginMutation.isPending ? "none" : "auto" }}
          >
            <GoogleLogin
              onSuccess={(credentialResponse) =>
                handleGoogleSuccess(credentialResponse.credential)
              }
              onError={() => toast.error(t("googleLoginFailed"))}
              width="500"
              size="large"
              text="signup_with"
            />
          </div>
        </div>

        <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </>
  )
}
