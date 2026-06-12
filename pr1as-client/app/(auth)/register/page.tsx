"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { AuthHeader } from "@/components/auth/auth-header"
import { PasswordStrengthChecklist } from "@/components/auth/password-strength-checklist"
import { Button } from "@/components/ui/button"
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
import { useRegister } from "@/lib/hooks/use-auth"
import {
  getErrorMessage,
  localizeServerMessage,
} from "@/lib/utils/error-handler"

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations("Auth")
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
          <FieldGroup className="gap-5">
            <Field>
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
            <Field>
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
