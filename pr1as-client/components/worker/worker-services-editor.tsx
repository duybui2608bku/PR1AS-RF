"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HashtagChipInput } from "@/components/worker/hashtag-chip-input"
import { useCurrency } from "@/lib/hooks/use-currency"
import {
  convertToVnd,
  convertVndTo,
  formatAmountInput,
  formatMoney,
  parseAmountInput,
} from "@/lib/currency"
import { splitServicesByCategory } from "@/lib/worker/worker-setup-catalog"
import {
  buildPricingFromUnits,
  normalizeWorkerPricingSlots,
  priceForUnit,
  WORKER_SETUP_PRICING_SLOT_ORDER,
} from "@/lib/worker/worker-setup-pricing"
import { cn } from "@/lib/utils"
import { serviceService, type ServiceItem } from "@/services/service.service"
import type { WorkerPricingSlot, WorkerPricingUnit } from "@/types"

type WorkerServicesEditorProps = {
  catalog: ServiceItem[]
  selectedPricing: Map<string, WorkerPricingSlot[]>
  onSelectedPricingChange: (next: Map<string, WorkerPricingSlot[]>) => void
  serviceHashtags: Map<string, string[]>
  onServiceHashtagsChange: (next: Map<string, string[]>) => void
}

export const WorkerServicesEditor = ({
  catalog,
  selectedPricing,
  onSelectedPricingChange,
  serviceHashtags,
  onServiceHashtagsChange,
}: WorkerServicesEditorProps) => {
  const t = useTranslations("WorkerSetup")
  const locale = useLocale()
  const { currency, meta: currencyMeta, localeTag } = useCurrency()
  const [priceDrafts, setPriceDrafts] = useState<Map<string, string>>(new Map())

  const { virtual: virtualList, physical: physicalList } =
    splitServicesByCategory(catalog)

  const toggleService = (serviceId: string) => {
    const next = new Map(selectedPricing)
    if (next.has(serviceId)) {
      next.delete(serviceId)
    } else {
      next.set(serviceId, [])
    }
    onSelectedPricingChange(next)
  }

  const setPriceForUnit = (
    serviceId: string,
    unit: WorkerPricingUnit,
    raw: string
  ) => {
    const typed = parseAmountInput(raw, currencyMeta.decimals)
    const valueVnd = typed == null ? undefined : convertToVnd(typed, currency)
    setPriceDrafts((prev) => {
      const next = new Map(prev)
      next.set(
        `${serviceId}:${unit}:${currency}`,
        formatAmountInput(raw, localeTag, currencyMeta.decimals)
      )
      return next
    })
    const next = new Map(selectedPricing)
    const cur = normalizeWorkerPricingSlots(next.get(serviceId) ?? [])
    next.set(serviceId, buildPricingFromUnits(unit, valueVnd, cur, "VND"))
    onSelectedPricingChange(next)
  }

  const handleHashtagsChange = (serviceId: string, tags: string[]) => {
    const next = new Map(serviceHashtags)
    next.set(serviceId, tags)
    onServiceHashtagsChange(next)
  }

  const renderServiceRow = (service: ServiceItem) => {
    const checked = selectedPricing.has(service.id)
    const pricing = normalizeWorkerPricingSlots(
      selectedPricing.get(service.id) ?? []
    )

    return (
      <div
        key={service.id}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-accent/60"
          onClick={() => toggleService(service.id)}
        >
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
              checked
                ? "border-primary bg-primary"
                : "border-muted-foreground/40 bg-transparent"
            )}
          >
            {checked && (
              <Check className="size-3.5 stroke-[3] text-primary-foreground" />
            )}
          </div>
          <span className="flex-1 text-sm leading-snug font-medium">
            {serviceService.getName(service.name, locale)}
          </span>
        </Button>

        {checked && (
          <div className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t("pricing.priceHelp", { currency: currencyMeta.code })}
            </p>
            {WORKER_SETUP_PRICING_SLOT_ORDER.map((unit) => {
              const priceVnd = priceForUnit(pricing, unit)
              const draftKey = `${service.id}:${unit}:${currency}`
              const displayValue = priceDrafts.has(draftKey)
                ? priceDrafts.get(draftKey)!
                : formatAmountInput(
                    priceVnd == null
                      ? undefined
                      : Number(
                          convertVndTo(priceVnd, currency).toFixed(
                            currencyMeta.decimals
                          )
                        ),
                    localeTag,
                    currencyMeta.decimals
                  )
              const showVnd =
                currency !== "VND" && priceVnd != null && priceVnd > 0
              return (
                <div key={unit} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Label className="w-20 shrink-0 text-xs text-muted-foreground">
                      {t(`units.${unit}`)}
                    </Label>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode={
                          currencyMeta.decimals > 0 ? "decimal" : "numeric"
                        }
                        placeholder="0"
                        value={displayValue}
                        onChange={(e) =>
                          setPriceForUnit(service.id, unit, e.target.value)
                        }
                        className="h-11 pr-10 text-sm"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        {currencyMeta.symbol}
                      </span>
                    </div>
                  </div>
                  {showVnd && (
                    <p className="pl-[5.75rem] text-xs text-muted-foreground">
                      ≈ {formatMoney(priceVnd, "VND", localeTag)}
                    </p>
                  )}
                </div>
              )
            })}
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">
                {t("pricing.hashtagsLabel")}
              </Label>
              <HashtagChipInput
                value={serviceHashtags.get(service.id) ?? []}
                onChange={(tags) => handleHashtagsChange(service.id, tags)}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            {t("services.virtualTitle")}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("services.subtitle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {virtualList.map((s) => renderServiceRow(s))}
          {virtualList.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("services.emptyVirtual")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">
            {t("services.physicalTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {physicalList.map((s) => renderServiceRow(s))}
          {physicalList.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("services.emptyPhysical")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
