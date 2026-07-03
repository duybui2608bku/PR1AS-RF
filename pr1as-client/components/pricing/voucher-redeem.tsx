"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Ticket } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRedeemVoucher } from "@/lib/hooks/use-vouchers"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"

export const VoucherRedeem = () => {
  const t = useTranslations("Pricing.voucher")
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [code, setCode] = useState("")
  const redeemMutation = useRedeemVoucher()

  const handleSubmit = () => {
    const trimmed = code.trim()
    if (!isAuthenticated) {
      router.push(`/login?next=/pricing`)
      return
    }
    if (trimmed.length < 4) {
      toast.error(t("invalidCode"))
      return
    }
    redeemMutation.mutate(trimmed, {
      onSuccess: (data) => {
        setCode("")
        toast.success(
          t("success", {
            plan: data?.package?.display_name ?? data?.plan_code ?? "",
          })
        )
        router.refresh()
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t("error")))
      },
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSubmit()
  }

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Ticket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("description")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              className="font-mono uppercase"
              maxLength={64}
              disabled={redeemMutation.isPending}
              aria-label={t("title")}
            />
            <Button
              onClick={handleSubmit}
              disabled={redeemMutation.isPending || (isAuthenticated && !code.trim())}
              className="shrink-0"
            >
              {redeemMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isAuthenticated ? t("submit") : t("loginToRedeem")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
