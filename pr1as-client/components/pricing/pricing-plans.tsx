"use client"

import { useRouter } from "next/navigation"
import { Check, CheckCircle2, Loader2, Minus, Sparkles, Star, Zap } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMyPricing, useUpgradePricing } from "@/lib/hooks/use-pricing"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  PricingPackage,
  PricingPlanCode,
} from "@/services/pricing.service"

const PLAN_RANK: Record<PricingPlanCode, number> = {
  standard: 0,
  gold: 1,
  diamond: 2,
}

const MONTHLY_PRICE: Record<PricingPlanCode, number> = {
  standard: 0,
  gold: 199_000,
  diamond: 399_000,
}

const PLAN_META: Record<
  PricingPlanCode,
  {
    icon: React.ReactNode
    highlight: boolean
    badge: string | null
    color: string
    border: string
  }
> = {
  standard: {
    icon: <Zap className="size-5" />,
    highlight: false,
    badge: null,
    color: "text-foreground",
    border: "border-border",
  },
  gold: {
    icon: <Star className="size-5 fill-amber-400 text-amber-400" />,
    highlight: true,
    badge: "Phổ biến nhất",
    color: "text-amber-500",
    border: "border-amber-400",
  },
  diamond: {
    icon: <Sparkles className="size-5 text-violet-500" />,
    highlight: false,
    badge: "Cao cấp",
    color: "text-violet-500",
    border: "border-violet-400",
  },
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  )

const formatLimit = (value: number | null, unit = "") =>
  value === null ? "Không giới hạn" : `${value}${unit ? " " + unit : ""}`

const FEATURE_ROWS: {
  label: string
  get: (pkg: PricingPackage) => { enabled: boolean; text: string }
}[] = [
  {
    label: "Nhắn tin với khách hàng",
    get: (pkg) => ({
      enabled: pkg.features.messaging_enabled,
      text: pkg.features.messaging_enabled
        ? formatLimit(pkg.features.messaging_max_recipients, "người nhận")
        : "—",
    }),
  },
  {
    label: "Đăng tin",
    get: (pkg) => ({
      enabled: pkg.features.create_job_enabled,
      text: pkg.features.create_job_enabled
        ? formatLimit(pkg.features.create_job_limit, "job")
        : "—",
    }),
  },
  {
    label: "Boost hồ sơ mỗi tháng",
    get: (pkg) => ({
      enabled: pkg.features.boost_profile_enabled,
      text: pkg.features.boost_profile_enabled
        ? formatLimit(pkg.features.boost_profile_monthly_limit, "lượt")
        : "—",
    }),
  },
  {
    label: "Ẩn quảng cáo",
    get: (pkg) => ({
      enabled: !pkg.features.ads_enabled,
      text: !pkg.features.ads_enabled ? "Có" : "—",
    }),
  },
]

type ButtonState =
  | { kind: "current" }
  | { kind: "lower" }
  | { kind: "upgrade" }
  | { kind: "free" }
  | { kind: "guest-free" }
  | { kind: "guest-upgrade" }

function getButtonState(
  pkgCode: PricingPlanCode,
  isAuthenticated: boolean,
  currentPlan: PricingPlanCode | undefined
): ButtonState {
  if (!isAuthenticated) {
    return pkgCode === "standard"
      ? { kind: "guest-free" }
      : { kind: "guest-upgrade" }
  }

  const current = currentPlan ?? "standard"
  if (pkgCode === current) return { kind: "current" }

  const targetRank = PLAN_RANK[pkgCode]
  const currentRank = PLAN_RANK[current]
  if (targetRank < currentRank) return { kind: "lower" }
  if (pkgCode === "standard") return { kind: "free" }
  return { kind: "upgrade" }
}

export function PricingPlans({ packages }: { packages: PricingPackage[] }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const storedPlan = useAuthStore((s) => s.user?.pricing_plan_code) as
    | PricingPlanCode
    | undefined

  const myPricingQuery = useMyPricing()
  const upgradeMutation = useUpgradePricing()

  const currentPlan: PricingPlanCode | undefined =
    myPricingQuery.data?.plan_code ?? storedPlan

  const [pendingPkg, setPendingPkg] = useState<PricingPackage | null>(null)

  const sortedPackages = useMemo(
    () =>
      [...packages].sort(
        (a, b) => MONTHLY_PRICE[a.package_code] - MONTHLY_PRICE[b.package_code]
      ),
    [packages]
  )

  const handleClick = (pkg: PricingPackage, state: ButtonState) => {
    switch (state.kind) {
      case "guest-free":
        router.push("/register")
        return
      case "guest-upgrade":
        router.push(`/login?next=/pricing`)
        return
      case "upgrade":
        setPendingPkg(pkg)
        return
      default:
        return
    }
  }

  const handleConfirmUpgrade = async () => {
    if (!pendingPkg || pendingPkg.package_code === "standard") return
    try {
      await upgradeMutation.mutateAsync({
        target_plan_code: pendingPkg.package_code,
        duration_months: 1,
      })
      toast.success(`Đã nâng cấp lên gói ${pendingPkg.display_name}.`)
      setPendingPkg(null)
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể nâng cấp gói. Vui lòng thử lại."))
    }
  }

  return (
    <>
      <div className="mx-auto mt-10 grid w-full gap-6 md:w-10/12 md:grid-cols-3">
        {sortedPackages.map((pkg) => {
          const meta = PLAN_META[pkg.package_code]
          const price = MONTHLY_PRICE[pkg.package_code]
          const state = getButtonState(
            pkg.package_code,
            isAuthenticated,
            currentPlan
          )
          const isCurrent = state.kind === "current"

          return (
            <div
              key={pkg._id}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                meta.border,
                meta.highlight && "shadow-amber-100 dark:shadow-amber-900/20",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {meta.badge ? (
                <span
                  className={cn(
                    "absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-0.5 text-xs font-semibold text-white",
                    pkg.package_code === "gold"
                      ? "bg-amber-400"
                      : "bg-violet-500"
                  )}
                >
                  {meta.badge}
                </span>
              ) : null}

              <div className="flex items-center gap-2">
                <span className={meta.color}>{meta.icon}</span>
                <span className={cn("text-lg font-bold", meta.color)}>
                  {pkg.display_name}
                </span>
                {isCurrent ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="size-3.5" />
                    Đang dùng
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                {price === 0 ? (
                  <p className="text-3xl font-extrabold">Miễn phí</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold">
                      {formatCurrency(price)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      mỗi tháng
                    </p>
                  </>
                )}
              </div>

              <hr className="my-5 border-border" />

              <ul className="flex-1 space-y-3 text-sm">
                {FEATURE_ROWS.map((row) => {
                  const { enabled, text } = row.get(pkg)
                  return (
                    <li
                      key={row.label}
                      className="flex items-start gap-2.5"
                    >
                      {enabled ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <div>
                        <span
                          className={
                            enabled
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {row.label}
                        </span>
                        {enabled ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {text}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>

              <PlanCtaButton
                state={state}
                meta={meta}
                isLoading={
                  upgradeMutation.isPending &&
                  pendingPkg?._id === pkg._id
                }
                onClick={() => handleClick(pkg, state)}
              />
            </div>
          )
        })}
      </div>

      <Dialog
        open={pendingPkg !== null}
        onOpenChange={(open) => {
          if (!open && !upgradeMutation.isPending) {
            setPendingPkg(null)
          }
        }}
      >
        <DialogContent>
          {pendingPkg ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Xác nhận nâng cấp gói {pendingPkg.display_name}
                </DialogTitle>
                <DialogDescription>
                  Hệ thống sẽ trừ trực tiếp từ số dư ví của bạn.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gói</span>
                  <span className="font-semibold">
                    {pendingPkg.display_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thời hạn</span>
                  <span className="font-semibold">1 tháng</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Số tiền</span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(MONTHLY_PRICE[pendingPkg.package_code])}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingPkg(null)}
                  disabled={upgradeMutation.isPending}
                >
                  Huỷ
                </Button>
                <Button
                  onClick={handleConfirmUpgrade}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Xác nhận nâng cấp
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function PlanCtaButton({
  state,
  meta,
  isLoading,
  onClick,
}: {
  state: ButtonState
  meta: (typeof PLAN_META)[PricingPlanCode]
  isLoading: boolean
  onClick: () => void
}) {
  const baseClass = cn("mt-6 w-full", meta.highlight ? "shadow-md" : "")

  switch (state.kind) {
    case "current":
      return (
        <Button
          className={cn(baseClass, "bg-primary/10 text-primary hover:bg-primary/10")}
          variant="ghost"
          disabled
        >
          <CheckCircle2 className="size-4" />
          Gói hiện tại
        </Button>
      )
    case "lower":
      return (
        <Button className={baseClass} variant="outline" disabled>
          Gói thấp hơn
        </Button>
      )
    case "free":
      return (
        <Button className={baseClass} variant="outline" disabled>
          Gói miễn phí
        </Button>
      )
    case "guest-free":
      return (
        <Button
          className={baseClass}
          variant={meta.highlight ? "default" : "outline"}
          onClick={onClick}
        >
          Bắt đầu miễn phí
        </Button>
      )
    case "guest-upgrade":
      return (
        <Button
          className={baseClass}
          variant={meta.highlight ? "default" : "outline"}
          onClick={onClick}
        >
          Đăng nhập để nâng cấp
        </Button>
      )
    case "upgrade":
      return (
        <Button
          className={baseClass}
          variant={meta.highlight ? "default" : "outline"}
          onClick={onClick}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Nâng cấp ngay
        </Button>
      )
  }
}
