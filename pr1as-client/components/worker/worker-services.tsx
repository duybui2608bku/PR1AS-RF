"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Crown, MessageCircle, ShoppingCart } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { BookWorkerDialog } from "@/components/worker/book-worker-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useMyPricing } from "@/lib/hooks/use-pricing"
import { useCurrency } from "@/lib/hooks/use-currency"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { serviceService } from "@/services/service.service"
import type { WorkerServiceItem, WorkerServicePricing } from "@/types"

const MESSAGING_PLAN_CODES = new Set(["gold", "diamond"])

type Translator = ReturnType<typeof useTranslations>

const UNIT_KEY: Record<string, string> = {
  HOURLY: "enums.unitHourly",
  DAILY: "enums.unitDaily",
  MONTHLY: "enums.unitMonthly",
}

const formatPrice = (
  pricing: WorkerServicePricing | undefined,
  t: Translator,
  format: (amountVnd: number | null | undefined) => string,
) => {
  if (!pricing) return t("services.noPrice")

  const value = format(pricing.price_vnd ?? pricing.price)
  const unit = t(UNIT_KEY[pricing.unit] ?? "enums.unitMonthly")

  return t("services.priceFrom", { value, unit })
}

const cheapestPricing = (
  pricing: WorkerServicePricing[],
): WorkerServicePricing | undefined => {
  if (!pricing.length) return undefined
  return [...pricing].sort(
    (a, b) => (a.price_vnd ?? a.price) - (b.price_vnd ?? b.price),
  )[0]
}

type Props = {
  workerId: string
  workerName: string
  services: WorkerServiceItem[]
  workerReputationScore?: number
}

export function WorkerServices({ workerId, workerName, services, workerReputationScore = 100 }: Props) {
  const t = useTranslations("WorkerProfile")
  const locale = useLocale()
  const { format } = useCurrency()
  const [bookOpen, setBookOpen] = useState(false)
  const [upgradePlanOpen, setUpgradePlanOpen] = useState(false)
  const router = useRouter()
  const { requireAuth } = useAuthRequired()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const currentUserId = user?.id
  const isOwnProfile = currentUserId === workerId
  const isWorkerLowReputation = workerReputationScore < 30
  const storedPlanCode = user?.meta_data?.pricing_plan_code?.toLowerCase()
  const storedPlanAllowsMessaging = storedPlanCode
    ? MESSAGING_PLAN_CODES.has(storedPlanCode)
    : false

  const myPricingQuery = useMyPricing()
  const canMessageWorker =
    myPricingQuery.data !== undefined
      ? !myPricingQuery.data.is_expired &&
        myPricingQuery.data.package.features.messaging_enabled
      : storedPlanAllowsMessaging
  const isCheckingPricing =
    isAuthenticated && myPricingQuery.isLoading && !storedPlanCode
  const isMessageLocked =
    isAuthenticated && !isOwnProfile && !canMessageWorker

  const { data: catalog = [] } = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
  })

  const catalogByCode = useMemo(() => {
    const map = new Map<string, (typeof catalog)[number]>()
    for (const item of catalog) {
      map.set(item.code, item)
    }
    return map
  }, [catalog])

  const activeServices = useMemo(
    () => services.filter((s) => s.is_active),
    [services],
  )

  const [selectedId, setSelectedId] = useState<string>(
    () => activeServices[0]?._id ?? "",
  )

  const selectedService = useMemo(
    () => activeServices.find((s) => s._id === selectedId) ?? null,
    [activeServices, selectedId],
  )

  const selectedServiceName = useMemo(() => {
    if (!selectedService) return ""
    const catalogItem = catalogByCode.get(selectedService.service_code)
    return catalogItem
      ? serviceService.getName(catalogItem.name, locale)
      : selectedService.service_code
  }, [selectedService, catalogByCode, locale])

  const handleBook = () => {
    requireAuth(() => {
      if (isOwnProfile) {
        toast.info(t("services.cannotBookSelf"))
        return
      }
      if (isWorkerLowReputation) {
        toast.error(t("services.cannotBookLowReputation"))
        return
      }
      if (!selectedId) {
        toast.warning(t("services.selectServiceWarning"))
        return
      }
      setBookOpen(true)
    })
  }

  const handleMessage = () => {
    requireAuth(() => {
      if (isOwnProfile) {
        toast.info(t("services.cannotMessageSelf"))
        return
      }
      if (isCheckingPricing) {
        toast.info(t("services.checkingPlan"))
        return
      }
      if (!canMessageWorker) {
        setUpgradePlanOpen(true)
        return
      }
      router.push(`/chat?receiver_id=${workerId}`)
    })
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">
          {t("services.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2">
        {activeServices.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("services.empty")}
          </p>
        ) : (
          <RadioGroup
            value={selectedId}
            onValueChange={setSelectedId}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {activeServices.map((service) => {
              const catalogItem = catalogByCode.get(service.service_code)
              const name = catalogItem
                ? serviceService.getName(catalogItem.name, locale)
                : service.service_code
              const cheapest = cheapestPricing(service.pricing)
              const isActive = selectedId === service._id

              return (
                <label
                  key={service._id}
                  htmlFor={`worker-service-${service._id}`}
                  className={cn(
                    "flex items-center cursor-pointer gap-2 rounded-lg border p-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    value={service._id}
                    id={`worker-service-${service._id}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPrice(cheapest, t, format)}
                    </p>
                  </div>
                </label>
              )
            })}
          </RadioGroup>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!selectedId || isOwnProfile || isWorkerLowReputation}
          onClick={handleBook}
        >
          <ShoppingCart className="size-4" />
          {isWorkerLowReputation
            ? t("services.bookLowReputation")
            : t("services.book")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className={cn("w-full", isMessageLocked && "opacity-60")}
          disabled={isOwnProfile || isCheckingPricing}
          aria-disabled={isMessageLocked}
          onClick={handleMessage}
        >
          <MessageCircle className="size-4" />
          {isCheckingPricing ? t("services.checking") : t("services.message")}
        </Button>
      </CardContent>

      <BookWorkerDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        workerId={workerId}
        workerName={workerName}
        service={selectedService}
        serviceName={selectedServiceName}
      />

      <Dialog open={upgradePlanOpen} onOpenChange={setUpgradePlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Crown className="size-5" />
            </div>
            <DialogTitle>{t("services.upgradeTitle")}</DialogTitle>
            <DialogDescription>{t("services.upgradeDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpgradePlanOpen(false)}
            >
              {t("services.upgradeLater")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setUpgradePlanOpen(false)
                router.push("/pricing")
              }}
            >
              {t("services.upgradeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
