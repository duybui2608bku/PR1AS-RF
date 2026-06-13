import { Check, Minus, Sparkles, Star, Zap } from "lucide-react"
import { getTranslations, getLocale } from "next-intl/server"

import { SiteLayout } from "@/components/layout/site-layout"
import { PricingPlans } from "@/components/pricing/pricing-plans"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { pricingService, type PricingPackage } from "@/services/pricing.service"
import { cn } from "@/lib/utils"

export async function generateMetadata() {
  const t = await getTranslations("Pricing")
  return {
    title: t("title"),
    description: t("description"),
  }
}

const formatCurrency = (amount: number, locale: string) =>
  new Intl.NumberFormat(locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "VND",
  }).format(amount)

const getPackagePrice = (pkg: PricingPackage) =>
  Number.isFinite(pkg.price) ? pkg.price : 0

export default async function PricingPage() {
  const t = await getTranslations("Pricing")
  const locale = await getLocale()
  let packages: PricingPackage[] = []
  let fetchError = false

  try {
    const raw = await pricingService.getPublicPackages()
    packages = [...raw].sort((a, b) => getPackagePrice(a) - getPackagePrice(b))
  } catch {
    fetchError = true
  }

  const PLAN_META: Record<
    PricingPackage["package_code"],
    {
      icon: React.ReactNode
      color: string
    }
  > = {
    standard: {
      icon: <Zap className="size-5" />,
      color: "text-foreground",
    },
    gold: {
      icon: <Star className="size-5 fill-amber-400 text-amber-400" />,
      color: "text-amber-500",
    },
    diamond: {
      icon: <Sparkles className="size-5 text-violet-500" />,
      color: "text-violet-500",
    },
  }

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

  return (
    <SiteLayout>
      {/* ── Hero ── */}
      <section className="container mx-auto px-4 py-10 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            {t("title")}
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            {t("heroDescription")}
          </p>
        </div>

        {fetchError ? (
          <Alert variant="destructive" className="mx-auto mt-10 max-w-2xl">
            <AlertTitle>{t("fetchErrorTitle")}</AlertTitle>
            <AlertDescription>{t("fetchErrorDescription")}</AlertDescription>
          </Alert>
        ) : (
          <>
            <PricingPlans packages={packages} />

            {/* ── Comparison table ── */}
            <div className="mt-12 md:mt-16">
              <h2 className="mb-5 text-center text-xl font-bold tracking-tight md:mb-6 md:text-2xl">
                {t("comparisonTitle")}
              </h2>

              {/* Mobile: nhóm thẻ theo tính năng (iOS) */}
              <div className="space-y-3 md:hidden">
                {[
                  {
                    label: t("pricePerMonth"),
                    get: (pkg: PricingPackage) => ({
                      enabled: true,
                      text:
                        getPackagePrice(pkg) === 0
                          ? t("free")
                          : formatCurrency(getPackagePrice(pkg), locale),
                    }),
                  },
                  ...FEATURE_ROWS,
                ].map((row) => (
                  <div
                    key={row.label}
                    className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                  >
                    <p className="border-b bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                      {row.label}
                    </p>
                    <ul>
                      {packages.map((pkg, index) => {
                        const meta = PLAN_META[pkg.package_code]
                        const { enabled, text } = row.get(pkg)
                        return (
                          <li
                            key={pkg.id}
                            className={cn(
                              "flex items-center justify-between gap-3 px-4 py-3 text-sm",
                              index < packages.length - 1 && "border-b"
                            )}
                          >
                            <span
                              className={cn(
                                "flex items-center gap-2 font-medium",
                                meta.color
                              )}
                            >
                              {meta.icon}
                              {pkg.display_name}
                            </span>
                            {enabled ? (
                              <span className="flex items-center gap-1.5 text-right">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                                  <Check className="size-3.5" />
                                </span>
                                <span className="text-muted-foreground">
                                  {text}
                                </span>
                              </span>
                            ) : (
                              <Minus className="size-4 text-muted-foreground/40" />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Desktop: comparison table */}
              <div className="hidden overflow-x-auto rounded-xl border md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="w-1/3 px-6 py-4 font-semibold text-muted-foreground">
                        {t("featureColumn")}
                      </th>
                      {packages.map((pkg) => {
                        const meta = PLAN_META[pkg.package_code]
                        return (
                          <th
                            key={pkg.id}
                            className={cn(
                              "px-6 py-4 text-center font-bold",
                              meta.color
                            )}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {meta.icon}
                              {pkg.display_name}
                            </span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Price row */}
                    <tr className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">
                        {t("pricePerMonth")}
                      </td>
                      {packages.map((pkg) => (
                        <td
                          key={pkg.id}
                          className="px-6 py-4 text-center font-semibold"
                        >
                          {getPackagePrice(pkg) === 0
                            ? t("free")
                            : formatCurrency(getPackagePrice(pkg), locale)}
                        </td>
                      ))}
                    </tr>

                    {FEATURE_ROWS.map((row, i) => (
                      <tr
                        key={row.label}
                        className={cn(
                          "hover:bg-muted/30",
                          i % 2 === 0 ? "" : "bg-muted/10"
                        )}
                      >
                        <td className="px-6 py-4 font-medium">{row.label}</td>
                        {packages.map((pkg) => {
                          const { enabled, text } = row.get(pkg)
                          return (
                            <td key={pkg.id} className="px-6 py-4 text-center">
                              {enabled ? (
                                <span className="flex flex-col items-center gap-0.5">
                                  <Check className="size-4 text-green-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {text}
                                  </span>
                                </span>
                              ) : (
                                <Minus className="mx-auto size-4 text-muted-foreground/40" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  )
}
