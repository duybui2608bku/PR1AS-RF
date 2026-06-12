"use client"

import { useRouter } from "next/navigation"
import { LogIn, UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthDialogStore } from "@/lib/store/auth-dialog-store"

export function AuthRequiredDialog() {
  const { open, fromPath, closeAuthDialog } = useAuthDialogStore()
  const router = useRouter()
  const t = useTranslations("Auth")

  const handleLogin = () => {
    closeAuthDialog()
    const from = fromPath ? `?from=${encodeURIComponent(fromPath)}` : ""
    router.push(`/login${from}`)
  }

  const handleRegister = () => {
    closeAuthDialog()
    router.push("/register")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) closeAuthDialog() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("requireLoginTitle")}</DialogTitle>
          <DialogDescription>
            {t("requireLoginDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={handleLogin} className="w-full gap-2">
            <LogIn className="size-4" />
            {t("loginButton")}
          </Button>
          <Button onClick={handleRegister} variant="outline" className="w-full gap-2">
            <UserPlus className="size-4" />
            {t("createAccount")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
