"use client"

import { useRouter } from "next/navigation"
import { Check, CheckCircle2, Loader2, Minus, QrCode, Sparkles, Star, Zap } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { useMyPricing, useBuyPricing } from "@/lib/hooks/use-pricing"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { PricingPurchaseModal } from "@/components/pricing/pricing-purchase-modal"
import type {
  PricingPackage,
  PricingPlanCode,
  PricingPaymentResponse,
} from "@/services/pricing.service"

const PLAN_RANK: Record<PricingPlanCode, number> = {
  standard: 0,
  gold: 1,
  diamond: 2,
}

const getPackagePrice = (pkg: PricingPackage) =>
  Number.isFinite(pkg.price) ? pkg.price : 0

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

type PricingPlanMeta = {
  icon: React.ReactNode
  highlight: boolean
  badge: string | null
  color: string
  border: string
}

export function PricingPlans({ packages }: { packages: PricingPackage[] }) {
  const router = useRouter()
  const t = useTranslations("Pricing")
  const locale = useLocale()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const storedPlan = useAuthStore((s) => s.user?.meta_data?.pricing_plan_code) as
    | PricingPlanCode
    | undefined

  const myPricingQuery = useMyPricing()
  const buyMutation = useBuyPricing()

  const currentPlan: PricingPlanCode | undefined =
    myPricingQuery.data?.plan_code ?? storedPlan

  const [buyingPkg, setBuyingPkg] = useState<PricingPackage | null>(null)
  const [payment, setPayment] = useState<PricingPaymentResponse | null>(null)

  const PLAN_META: Record<PricingPlanCode, PricingPlanMeta> = {
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
      badge: t("popular"),
      color: "text-amber-500",
      border: "border-amber-400",
    },
    diamond: {
      icon: <Sparkles className="size-5 text-violet-500" />,
      highlight: false,
      badge: t("premium"),
      color: "text-violet-500",
      border: "border-violet-400",
    },
  }

  const sortedPackages = useMemo(
    () => [...packages].sort((a, b) => getPackagePrice(a) - getPackagePrice(b)),
    [packages]
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US", {
      style: "currency",
      currency: "VND",
    }).format(amount)

  const formatLimit = (value: number | null, unitKey?: string) =>
    value === null
      ? t("unlimited")
      : `${value}${unitKey ? " " + t(`units.${unitKey}`) : ""}`

  const FEATURE_ROWS: {
    label: string
    get: (pkg: PricingPackage) => { enabled: boolean; text: string }
  }[] = [
    {
      label: t("featureLabels.messaging"),
      get: (pkg) => ({
        enabled: pkg.features.messaging_enabled,
        text: pkg.features.messaging_enabled
          ? formatLimit(pkg.features.messaging_max_recipients, "recipients")
          : "—",
      }),
    },
    {
      label: t("featureLabels.createJob"),
      get: (pkg) => ({
        enabled: pkg.features.create_job_enabled,
        text: pkg.features.create_job_enabled
          ? formatLimit(pkg.features.create_job_limit, "job")
          : "—",
      }),
    },
    {
      label: t("featureLabels.boostProfile"),
      get: (pkg) => ({
        enabled: pkg.features.boost_profile_enabled,
        text: pkg.features.boost_profile_enabled
          ? formatLimit(pkg.features.boost_profile_monthly_limit, "turn")
          : "—",
      }),
    },
    {
      label: t("featureLabels.noAds"),
      get: (pkg) => ({
        enabled: !pkg.features.ads_enabled,
        text: !pkg.features.ads_enabled ? t("yes") : "—",
      }),
    },
  ]

  const handleClick = async (pkg: PricingPackage, state: ButtonState) => {
    switch (state.kind) {
      case "guest-free":
        router.push("/register")
        return
      case "guest-upgrade":
        router.push(`/login?next=/pricing`)
        return
      case "upgrade":
        if (pkg.package_code === "standard") return
        setBuyingPkg(pkg)
        try {
          const result = await buyMutation.mutateAsync({
            target_plan_code: pkg.package_code,
            duration_months: 1,
          })
          if (result) {
            setPayment(result)
          }
        } catch (error) {
          toast.error(getErrorMessage(error, t("errors.paymentCreateFailed")))
        } finally {
          setBuyingPkg(null)
        }
        return
      default:
        return
    }
  }

  return (
    <>
      <div className="mx-auto mt-10 grid w-full gap-6 md:w-10/12 md:grid-cols-3">
        {sortedPackages.map((pkg) => {
          const meta = PLAN_META[pkg.package_code]
          const price = getPackagePrice(pkg)
          const state = getButtonState(
            pkg.package_code,
            isAuthenticated,
            currentPlan
          )
          const isCurrent = state.kind === "current"

          return (
            <div
              key={pkg.id}
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
                    {t("active")}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                {price === 0 ? (
                  <p className="text-3xl font-extrabold">{t("free")}</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold">
                      {formatCurrency(price)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t("perMonth")}
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
                  buyMutation.isPending && buyingPkg?.id === pkg.id
                }
                onClick={() => handleClick(pkg, state)}
              />
            </div>
          )
        })}
      </div>

      <PricingPurchaseModal
        payment={payment}
        onClose={() => setPayment(null)}
      />
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
  meta: PricingPlanMeta
  isLoading: boolean
  onClick: () => void
}) {
  const t = useTranslations("Pricing.buttons")
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
          {t("current")}
        </Button>
      )
    case "lower":
      return (
        <Button className={baseClass} variant="outline" disabled>
          {t("lower")}
        </Button>
      )
    case "free":
      return (
        <Button className={baseClass} variant="outline" disabled>
          {t("free")}
        </Button>
      )
    case "guest-free":
      return (
        <Button
          className={baseClass}
          variant={meta.highlight ? "default" : "outline"}
          onClick={onClick}
        >
          {t("guestFree")}
        </Button>
      )
    case "guest-upgrade":
      return (
        <Button
          className={baseClass}
          variant={meta.highlight ? "default" : "outline"}
          onClick={onClick}
        >
          {t("guestUpgrade")}
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
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <QrCode className="size-4" />
          )}
          {t("buyNow")}
        </Button>
      )
  }
}
