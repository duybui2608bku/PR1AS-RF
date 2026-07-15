"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  Wallet,
  XCircle,
} from "lucide-react"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateDeposit, useWalletTransaction } from "@/lib/hooks/use-wallet"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type { DepositPayment } from "@/services/wallet.service"
import { formatVnd } from "@/components/wallet/wallet-format"

const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000]
const MIN_AMOUNT = 100
const MAX_AMOUNT = 50_000_000

const formatAmountInput = (value: string, localeTag = "vi-VN"): string => {
  const normalized = value.replace(/[^\d]/g, "")
  if (!normalized) return ""
  return new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
  }).format(Number.parseInt(normalized, 10))
}

export function WalletDepositPage() {
  const t = useTranslations("Wallet")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? "vi-VN"
  const createDepositMutation = useCreateDeposit()
  const [amount, setAmount] = useState("100000")
  const [payment, setPayment] = useState<DepositPayment | null>(null)
  const notifiedTransactionRef = useRef<string | null>(null)
  const transactionQuery = useWalletTransaction(
    payment?.transaction_id,
    Boolean(payment?.transaction_id)
  )
  const transactionStatus = transactionQuery.data?.status ?? "pending"
  const isPaymentSuccess = transactionStatus === "success"
  const isPaymentFailed = transactionStatus === "failed"
  const isPaymentExpired = transactionStatus === "expired"
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!payment?.expires_at || isPaymentSuccess || isPaymentFailed) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [payment?.expires_at, isPaymentSuccess, isPaymentFailed])

  const msLeft = payment?.expires_at
    ? new Date(payment.expires_at).getTime() - now
    : 0
  const isExpired =
    isPaymentExpired || (Boolean(payment?.expires_at) && msLeft <= 0)
  const countdownLabel = (() => {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000))
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0")
    const ss = String(totalSeconds % 60).padStart(2, "0")
    return `${mm}:${ss}`
  })()

  useEffect(() => {
    if (!payment || notifiedTransactionRef.current === payment.transaction_id) {
      return
    }

    if (isPaymentSuccess) {
      notifiedTransactionRef.current = payment.transaction_id
      toast.success(t("depositSuccessToast"))
    }

    if (isPaymentFailed) {
      notifiedTransactionRef.current = payment.transaction_id
      toast.error(t("depositFailedToast"))
    }
  }, [isPaymentFailed, isPaymentSuccess, payment, t])

  const parsedAmount = useMemo(() => {
    const normalized = amount.replace(/[^\d]/g, "")
    return Number.parseInt(normalized || "0", 10)
  }, [amount])

  const amountError = useMemo(() => {
    if (!parsedAmount) return t("enterAmount")
    if (parsedAmount < MIN_AMOUNT)
      return t("minAmount", { amount: formatVnd(MIN_AMOUNT, localeTag) })
    if (parsedAmount > MAX_AMOUNT)
      return t("maxAmount", { amount: formatVnd(MAX_AMOUNT, localeTag) })
    return ""
  }, [parsedAmount, t, localeTag])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (amountError) {
      toast.warning(amountError)
      return
    }

    try {
      const result = await createDepositMutation.mutateAsync({
        amount: parsedAmount,
      })
      if (!result) {
        toast.error(t("cannotCreatePayment"))
        return
      }
      notifiedTransactionRef.current = null
      setPayment(result)
      toast.success(t("paymentCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error, t("cannotCreatePayment")))
    }
  }

  const handleRegenerate = async () => {
    if (amountError) {
      toast.warning(amountError)
      return
    }
    try {
      const result = await createDepositMutation.mutateAsync({
        amount: parsedAmount,
      })
      if (!result) {
        toast.error(t("cannotCreatePayment"))
        return
      }
      notifiedTransactionRef.current = null
      setNow(Date.now())
      setPayment(result)
      toast.success(t("paymentCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error, t("cannotCreatePayment")))
    }
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(t("copied", { label }))
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("depositTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("depositSubtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/wallet">
            <ArrowLeft className="size-4" />
            {t("backToWallet")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-5" />
              {t("amount")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("depositAmount")}</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={formatAmountInput(amount, localeTag)}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="100000"
                />
                <div className="flex min-h-5 items-center justify-between gap-2 text-xs">
                  <span
                    className={
                      amountError
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }
                  >
                    {amountError || formatVnd(parsedAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMOUNT_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(preset))}
                  >
                    {formatAmountInput(String(preset), localeTag)} VND
                  </Button>
                ))}
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                <p className="mb-1 font-semibold">
                  {t("depositWarningTitle")}
                </p>
                <p>
                  {t.rich("depositWarningDesc", {
                    b: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  createDepositMutation.isPending || Boolean(amountError)
                }
              >
                {createDepositMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                {t("createPayment")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="size-5" />
              {t("payment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {payment ? (
              isExpired ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 text-center">
                  <XCircle className="size-10 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-base font-semibold">
                      {t("qrExpiredTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("qrExpiredMsg")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={
                      createDepositMutation.isPending || Boolean(amountError)
                    }
                  >
                    {createDepositMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <QrCode className="size-4" />
                    )}
                    {t("regenerateQr")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                  <div className="flex rounded-lg border bg-white p-3">
                    <Image
                      src={payment.qr_url}
                      alt={`QR ${payment.payment_code}`}
                      width={236}
                      height={236}
                      className="aspect-square w-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-3">
                    <PaymentRow
                      label={t("bank")}
                      value={payment.bank_name}
                      copyAria={t("copyAria", { label: t("bank") })}
                      onCopy={() =>
                        copyText(payment.bank_name, t("copyLabelBank"))
                      }
                    />
                    <PaymentRow
                      label={t("accountNumber")}
                      value={payment.bank_account_number}
                      copyAria={t("copyAria", { label: t("accountNumber") })}
                      onCopy={() =>
                        copyText(
                          payment.bank_account_number,
                          t("copyLabelAccount")
                        )
                      }
                    />
                    <PaymentRow
                      label={t("amount")}
                      value={formatVnd(payment.amount, localeTag)}
                      copyAria={t("copyAria", { label: t("amount") })}
                      onCopy={() =>
                        copyText(String(payment.amount), t("copyLabelAmount"))
                      }
                    />
                    <PaymentRow
                      label={t("content")}
                      value={payment.payment_content}
                      copyAria={t("copyAria", { label: t("content") })}
                      onCopy={() =>
                        copyText(
                          payment.payment_content,
                          t("copyLabelContent")
                        )
                      }
                    />
                    {!isPaymentSuccess && !isPaymentFailed ? (
                      <p className="text-center text-xs font-medium text-muted-foreground">
                        {t("qrCountdown", { time: countdownLabel })}
                      </p>
                    ) : null}
                    <PaymentStatus
                      isChecking={
                        transactionQuery.isFetching &&
                        !isPaymentSuccess &&
                        !isPaymentFailed
                      }
                      isFailed={isPaymentFailed}
                      isSuccess={isPaymentSuccess}
                    />
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/wallet">{t("viewWallet")}</Link>
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed">
                <QrCode className="size-12 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PaymentStatus({
  isChecking,
  isFailed,
  isSuccess,
}: {
  isChecking: boolean
  isFailed: boolean
  isSuccess: boolean
}) {
  const t = useTranslations("Wallet")

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4" />
        <span>{t("statusSuccessMsg")}</span>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="size-4" />
        <span>{t("statusFailedMsg")}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {isChecking ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4 text-amber-600 dark:text-amber-400" />
      )}
      <span>{t("statusWaiting")}</span>
    </div>
  )
}

function PaymentRow({
  label,
  value,
  copyAria,
  onCopy,
}: {
  label: string
  value: string
  copyAria: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCopy}
        aria-label={copyAria}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  )
}
