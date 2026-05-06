"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Copy, Loader2, QrCode, Wallet, XCircle } from "lucide-react"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateDeposit, useWalletTransaction } from "@/lib/hooks/use-wallet"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type { DepositPayment } from "@/services/wallet.service"
import { formatVnd } from "@/components/wallet/wallet-format"

const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000]
const MIN_AMOUNT = 100
const MAX_AMOUNT = 50_000_000

const formatAmountInput = (value: string): string => {
  const normalized = value.replace(/[^\d]/g, "")
  if (!normalized) return ""
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number.parseInt(normalized, 10))
}

export function WalletDepositPage() {
  const createDepositMutation = useCreateDeposit()
  const [amount, setAmount] = useState("100000")
  const [payment, setPayment] = useState<DepositPayment | null>(null)
  const notifiedTransactionRef = useRef<string | null>(null)
  const transactionQuery = useWalletTransaction(payment?.transaction_id, Boolean(payment?.transaction_id))
  const transactionStatus = transactionQuery.data?.status ?? "pending"
  const isPaymentSuccess = transactionStatus === "success"
  const isPaymentFailed = transactionStatus === "failed"

  useEffect(() => {
    if (!payment || notifiedTransactionRef.current === payment.transaction_id) {
      return
    }

    if (isPaymentSuccess) {
      notifiedTransactionRef.current = payment.transaction_id
      toast.success("Nap tien thanh cong. So du vi da duoc cap nhat.")
    }

    if (isPaymentFailed) {
      notifiedTransactionRef.current = payment.transaction_id
      toast.error("Giao dich nap tien that bai. Vui long kiem tra lai so tien chuyen khoan.")
    }
  }, [isPaymentFailed, isPaymentSuccess, payment])

  const parsedAmount = useMemo(() => {
    const normalized = amount.replace(/[^\d]/g, "")
    return Number.parseInt(normalized || "0", 10)
  }, [amount])

  const amountError = useMemo(() => {
    if (!parsedAmount) return "Nhập số tiền"
    if (parsedAmount < MIN_AMOUNT) return `Tối thiểu ${formatVnd(MIN_AMOUNT)}`
    if (parsedAmount > MAX_AMOUNT) return `Tối đa ${formatVnd(MAX_AMOUNT)}`
    return ""
  }, [parsedAmount])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (amountError) {
      toast.warning(amountError)
      return
    }

    try {
      const result = await createDepositMutation.mutateAsync({ amount: parsedAmount })
      if (!result) {
        toast.error("Không thể tạo thanh toán.")
        return
      }
      notifiedTransactionRef.current = null
      setPayment(result)
      toast.success("Đã tạo thanh toán.")
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tạo thanh toán."))
    }
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(`Đã sao chép ${label}.`)
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nạp tiền</h1>
          <p className="mt-1 text-sm text-muted-foreground">Thanh toán qua SePay</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/client/wallet">
            <ArrowLeft className="size-4" />
            Ví của tôi
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-5" />
              Số tiền
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền nạp</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={formatAmountInput(amount)}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="100000"
                />
                <div className="flex min-h-5 items-center justify-between gap-2 text-xs">
                  <span className={amountError ? "text-red-600" : "text-muted-foreground"}>
                    {amountError || formatVnd(parsedAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMOUNT_PRESETS.map((preset) => (
                  <Button key={preset} type="button" variant="outline" size="sm" onClick={() => setAmount(String(preset))}>
                    {formatAmountInput(String(preset))} VND
                  </Button>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={createDepositMutation.isPending || Boolean(amountError)}>
                {createDepositMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                Tạo thanh toán
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="size-5" />
              Thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {payment ? (
              <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                <div className="rounded-lg border bg-white p-3 flex">
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
                  <PaymentRow label="Ngân hàng" value={payment.bank_name} onCopy={() => copyText(payment.bank_name, "ngân hàng")} />
                  <PaymentRow
                    label="Số tài khoản"
                    value={payment.bank_account_number}
                    onCopy={() => copyText(payment.bank_account_number, "số tài khoản")}
                  />
                  <PaymentRow label="Số tiền" value={formatVnd(payment.amount)} onCopy={() => copyText(String(payment.amount), "số tiền")} />
                  <PaymentRow
                    label="Nội dung"
                    value={payment.payment_content}
                    onCopy={() => copyText(payment.payment_content, "nội dung")}
                  />
                  <PaymentStatus
                    isChecking={transactionQuery.isFetching && !isPaymentSuccess && !isPaymentFailed}
                    isFailed={isPaymentFailed}
                    isSuccess={isPaymentSuccess}
                  />
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/client/wallet">Xem ví</Link>
                  </Button>
                </div>
              </div>
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
  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="size-4" />
        <span>Da nhan tien va cap nhat vi</span>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <XCircle className="size-4" />
        <span>Giao dich that bai hoac sai so tien</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {isChecking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-amber-600" />}
      <span>Dang cho SePay xac nhan giao dich</span>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onCopy} aria-label={`Sao chép ${label}`}>
        <Copy className="size-4" />
      </Button>
    </div>
  )
}
