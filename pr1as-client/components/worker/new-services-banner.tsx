"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import type { ServiceItem } from "@/services/service.service"

type NewServicesBannerProps = {
  services: ServiceItem[]
  offeredServiceCodes: string[]
  onGoToServices?: () => void
}

export const NewServicesBanner = ({
  services,
  offeredServiceCodes,
  onGoToServices,
}: NewServicesBannerProps) => {
  const t = useTranslations("WorkerSetup")

  const offered = new Set(offeredServiceCodes)
  const missing = services.filter((s) => s.is_active && !offered.has(s.code))

  if (missing.length === 0) {
    return null
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">
        {t("newServicesBanner.message", { count: missing.length })}
      </p>
      <Button size="sm" onClick={onGoToServices}>
        {t("newServicesBanner.cta")}
      </Button>
    </div>
  )
}
