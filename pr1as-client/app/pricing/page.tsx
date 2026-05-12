import { Check, Minus, Sparkles, Star, Zap } from "lucide-react"

import { SiteLayout } from "@/components/layout/site-layout"
import { PricingPlans } from "@/components/pricing/pricing-plans"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { pricingService, type PricingPackage } from "@/services/pricing.service"
import { cn } from "@/lib/utils"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Bảng giá",
  description:
    "So sánh các gói Standard, Gold và Diamond của PR1AS để nâng cấp hồ sơ, nhắn tin với khách hàng và quản lý dịch vụ.",
  path: "/pricing",
})

const MONTHLY_PRICE: Record<PricingPackage["package_code"], number> = {
  standard: 0,
  gold: 199_000,
  diamond: 399_000,
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

export default async function PricingPage() {
  let packages: PricingPackage[] = []
  let fetchError = false

  try {
    const raw = await pricingService.getPublicPackages()
    packages = [...raw].sort(
      (a, b) => MONTHLY_PRICE[a.package_code] - MONTHLY_PRICE[b.package_code]
    )
  } catch {
    fetchError = true
  }

  return (
    <SiteLayout>
      {/* ── Hero ── */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
            Bảng giá
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Chọn gói phù hợp với bạn
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Tất cả các gói đều có thể nâng cấp bất cứ lúc nào. Thanh toán nhanh
            qua ví trong ứng dụng.
          </p>
        </div>

        {fetchError ? (
          <Alert variant="destructive" className="mx-auto mt-10 max-w-2xl">
            <AlertTitle>Không thể tải bảng giá</AlertTitle>
            <AlertDescription>
              Không lấy được dữ liệu từ API. Vui lòng kiểm tra backend và thử
              lại.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <PricingPlans packages={packages} />

            {/* ── Comparison table ── */}
            <div className="mt-16">
              <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
                SO SÁNH CHI TIẾT
              </h2>

              {/* Mobile: stacked cards per feature */}
              <div className="space-y-4 md:hidden">
                {[
                  {
                    label: "Giá / tháng",
                    get: (pkg: PricingPackage) => ({
                      enabled: true,
                      text:
                        MONTHLY_PRICE[pkg.package_code] === 0
                          ? "Miễn phí"
                          : formatCurrency(MONTHLY_PRICE[pkg.package_code]),
                    }),
                  },
                  ...FEATURE_ROWS,
                ].map((row) => (
                  <div
                    key={row.label}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <p className="mb-3 text-sm font-semibold">{row.label}</p>
                    <ul className="divide-y divide-border">
                      {packages.map((pkg) => {
                        const meta = PLAN_META[pkg.package_code]
                        const { enabled, text } = row.get(pkg)
                        return (
                          <li
                            key={pkg._id}
                            className="flex items-center justify-between gap-3 py-2.5 text-sm"
                          >
                            <span
                              className={cn(
                                "flex items-center gap-1.5 font-medium",
                                meta.color
                              )}
                            >
                              {meta.icon}
                              {pkg.display_name}
                            </span>
                            {enabled ? (
                              <span className="flex items-center gap-1.5 text-right">
                                <Check className="size-4 shrink-0 text-green-500" />
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
                        Tính năng
                      </th>
                      {packages.map((pkg) => {
                        const meta = PLAN_META[pkg.package_code]
                        return (
                          <th
                            key={pkg._id}
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
                      <td className="px-6 py-4 font-medium">Giá / tháng</td>
                      {packages.map((pkg) => (
                        <td
                          key={pkg._id}
                          className="px-6 py-4 text-center font-semibold"
                        >
                          {MONTHLY_PRICE[pkg.package_code] === 0
                            ? "Miễn phí"
                            : formatCurrency(MONTHLY_PRICE[pkg.package_code])}
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
                            <td key={pkg._id} className="px-6 py-4 text-center">
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
