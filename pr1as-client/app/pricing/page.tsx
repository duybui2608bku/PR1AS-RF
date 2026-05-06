import { Check, Minus, Sparkles, Star, Zap } from "lucide-react"

import { SiteLayout } from "@/components/layout/site-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { pricingService, type PricingPackage } from "@/services/pricing.service"
import { cn } from "@/lib/utils"

const MONTHLY_PRICE: Record<PricingPackage["package_code"], number> = {
  standard: 0,
  gold: 199_000,
  diamond: 399_000,
}

const PLAN_META: Record<
  PricingPackage["package_code"],
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
            <div className="mx-auto mt-10 grid w-10/12 gap-6 md:grid-cols-3">
              {packages.map((pkg) => {
                const meta = PLAN_META[pkg.package_code]
                const price = MONTHLY_PRICE[pkg.package_code]
                return (
                  <div
                    key={pkg._id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border-2 bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
                      meta.border,
                      meta.highlight &&
                        "shadow-amber-100 dark:shadow-amber-900/20"
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

                    {/* Plan name */}
                    <div className="flex items-center gap-2">
                      <span className={meta.color}>{meta.icon}</span>
                      <span className={cn("text-lg font-bold", meta.color)}>
                        {pkg.display_name}
                      </span>
                    </div>

                    {/* Price */}
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

                    {/* Divider */}
                    <hr className="my-5 border-border" />

                    {/* Features */}
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

                    {/* CTA */}
                    <Button
                      className={cn(
                        "mt-6 w-full",
                        meta.highlight ? "shadow-md" : ""
                      )}
                      variant={meta.highlight ? "default" : "outline"}
                    >
                      {price === 0 ? "Bắt đầu miễn phí" : "Nâng cấp ngay"}
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* ── Comparison table ── */}
            <div className="mt-16">
              <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">
                SO SÁNH CHI TIẾT
              </h2>
              <div className="overflow-x-auto rounded-xl border">
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
