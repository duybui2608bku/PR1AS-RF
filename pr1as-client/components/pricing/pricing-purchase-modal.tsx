"use client"

import Image from "next/image"
import { CheckCircle2, Copy, Loader2, QrCode, XCircle } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useWalletTransaction } from "@/lib/hooks/use-wallet"
import { useQueryClient } from "@tanstack/react-query"
import { PRICING_KEYS } from "@/lib/hooks/use-pricing"
import { WALLET_KEYS } from "@/lib/hooks/use-wallet"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import type { PricingPaymentResponse } from "@/services/pricing.service"

interface PricingPurchaseModalProps {
  payment: PricingPaymentResponse | null
  onClose: () => void
}

export function PricingPurchaseModal({ payment, onClose }: PricingPurchaseModalProps) {
  const t = useTranslations("Pricing.purchaseModal")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const notifiedRef = useRef<string | null>(null)

  const transactionQuery = useWalletTransaction(
    payment?.transaction_id,
    Boolean(payment?.transaction_id)
  )
  const status = transactionQuery.data?.status ?? "pending"
  const isSuccess = status === "success"
  const isFailed = status === "failed"

  useEffect(() => {
    if (!payment || notifiedRef.current === payment.transaction_id) return

    if (isSuccess) {
      notifiedRef.current = payment.transaction_id
      toast.success(t("successToast", { package: payment.package_display_name }))
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.all })
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        setUser({ ...currentUser })
      }
    }

    if (isFailed) {
      notifiedRef.current = payment.transaction_id
      toast.error(t("failedToast"))
    }
  }, [isSuccess, isFailed, payment, queryClient, setUser, t])

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat(locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US", {
      style: "currency",
      currency: "VND",
    }).format(amount)

  const copyText = async (value: string, labelKey: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(t("copied", { label: t(labelKey).toLowerCase() }))
  }

  const canClose = !payment || isSuccess || isFailed

  return (
    <Dialog
      open={payment !== null}
      onOpenChange={(open) => {
        if (!open && canClose) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        {payment ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="size-5" />
                {t("title", { package: payment.package_display_name })}
              </DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="flex items-center justify-center rounded-lg border bg-white p-2">
                <Image
                  src={payment.qr_url}
                  alt={`QR ${payment.payment_code}`}
                  width={200}
                  height={200}
                  className="aspect-square w-full object-contain"
                  unoptimized
                />
              </div>

              <div className="space-y-2.5">
                <PaymentRow
                  label={t("bankLabel")}
                  value={payment.bank_name}
                  onCopy={() => copyText(payment.bank_name, "bankLabel")}
                />
                <PaymentRow
                  label={t("accountLabel")}
                  value={payment.bank_account_number}
                  onCopy={() => copyText(payment.bank_account_number, "accountLabel")}
                />
                <PaymentRow
                  label={t("amountLabel")}
                  value={formatVnd(payment.amount)}
                  onCopy={() => copyText(String(payment.amount), "amountLabel")}
                />
                <PaymentRow
                  label={t("contentLabel")}
                  value={payment.payment_content}
                  onCopy={() => copyText(payment.payment_content, "contentLabel")}
                />

                <PaymentStatus
                  isChecking={transactionQuery.isFetching && !isSuccess && !isFailed}
                  isSuccess={isSuccess}
                  isFailed={isFailed}
                />
              </div>
            </div>

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              <p className="font-semibold">⚠️ {t("noteTitle")}</p>
              <p className="mt-1">{t("noteContent", { content: payment.payment_content })}</p>
            </div>

            {canClose && (
              <Button variant="outline" className="w-full" onClick={onClose}>
                {isSuccess ? t("close") : t("cancel")}
              </Button>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PaymentRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={onCopy}
        aria-label={`Sao chép ${label}`}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  )
}

function PaymentStatus({
  isChecking,
  isSuccess,
  isFailed,
}: {
  isChecking: boolean
  isSuccess: boolean
  isFailed: boolean
}) {
  const t = useTranslations("Pricing.purchaseModal")
  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4" />
        <span>{t("successStatus")}</span>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="size-4" />
        <span>{t("failedStatus")}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {isChecking ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Loader2 className="size-4 animate-spin text-amber-600 dark:text-amber-400" />
      )}
      <span>{t("checkingStatus")}</span>
    </div>
  )
}
