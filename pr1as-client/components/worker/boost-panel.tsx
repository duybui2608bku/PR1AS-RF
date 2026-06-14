"use client"

import * as React from "react"
import { Zap, Star, Clock, Coins, Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, type Locale } from "date-fns"
import { enUS, vi, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"

import { boostService, type BoostType } from "@/services/boost.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { queryKeys } from "@/lib/query-keys"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
}

interface BoostCardProps {
  title: string
  description: string
  cost: number
  durationHours: number
  boostType: BoostType
  tier: 1 | 2
  balance: number
  isActiveBoost: boolean
  onActivate: (type: BoostType) => void
  isPending: boolean
}

function BoostCard({
  title,
  description,
  cost,
  durationHours,
  boostType,
  tier,
  balance,
  isActiveBoost,
  onActivate,
  isPending,
}: BoostCardProps) {
  const t = useTranslations("WorkerBoost.panel")
  const isFeatured = tier === 1
  const canAfford = balance >= cost
  const disabled = isPending || isActiveBoost || !canAfford

  return (
    <Card
      className={
        isFeatured
          ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 dark:border-yellow-700 dark:from-yellow-950/30 dark:to-orange-950/30"
          : "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30"
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {isFeatured ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <Zap className="h-4 w-4 text-blue-500" />
            )}
            {title}
          </CardTitle>
          <Badge
            variant={isFeatured ? "default" : "secondary"}
            className="text-xs"
          >
            {isFeatured ? t("featuredBadge") : t("basicBadge")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <Coins className="h-4 w-4 text-amber-500" />
            {t("points", { count: cost })}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t("hours", { count: durationHours })}
          </span>
        </div>
        {!canAfford && (
          <p className="text-xs text-destructive">
            {t("notEnoughPointsDetail", { points: cost - balance })}
          </p>
        )}
        <Button
          size="sm"
          className="w-full"
          variant={isFeatured ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onActivate(boostType)}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isActiveBoost
            ? t("activeButton")
            : !canAfford
              ? t("notEnoughPointsButton")
              : t("activateButton")}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BoostPanel() {
  const t = useTranslations("WorkerBoost.panel")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale]
  const dateFnsLocale = DATE_FNS_LOCALES[locale]
  const queryClient = useQueryClient()

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: queryKeys.boostPoints,
    queryFn: () => boostService.getPoints(10, 0),
  })

  const { data: statusData } = useQuery({
    queryKey: queryKeys.boostStatus,
    queryFn: () => boostService.getStatus(),
    refetchInterval: 30_000,
  })

  const reasonLabels = React.useMemo<Record<string, string>>(
    () => ({
      attendance: t("reasons.attendance"),
      attendance_streak_bonus: t("reasons.attendanceStreakBonus"),
      attendance_monthly_bonus: t("reasons.attendanceMonthlyBonus"),
      gold_package: t("reasons.goldPackage"),
      diamond_package: t("reasons.diamondPackage"),
      boost_spend: t("reasons.boostSpend"),
      admin_adjust: t("reasons.adminAdjust"),
    }),
    [t]
  )

  const getBoostTypeLabel = React.useCallback(
    (boostType: BoostType | null | undefined) =>
      boostType === "featured" ? t("featuredBadge") : t("basicBadge"),
    [t]
  )

  const { mutate: activate, isPending } = useMutation({
    mutationFn: (boostType: BoostType) => boostService.activateBoost(boostType),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boostPoints })
      queryClient.invalidateQueries({ queryKey: queryKeys.boostStatus })
      toast.success(
        t("activationSuccess", {
          type: getBoostTypeLabel(result.boost_type),
          expiresAt: new Date(result.expires_at).toLocaleString(localeTag),
        })
      )
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("activationError")
      toast.error(msg)
    },
  })

  const wallet = pointsData?.wallet
  const status = statusData
  const balance = wallet?.balance ?? 0
  const isActiveBoost = Boolean(status?.is_active)

  return (
    <div className="space-y-4">
      {/* Active boost banner */}
      {isActiveBoost && status?.expires_at && (
        <Card className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                {t("activeBoost", {
                  type: getBoostTypeLabel(status.boost_type),
                })}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {t("expires", {
                  time: formatDistanceToNow(new Date(status.expires_at), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  }),
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boost options */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BoostCard
          title={t("basicTitle")}
          description={t("basicDescription")}
          cost={50}
          durationHours={6}
          boostType="basic"
          tier={2}
          balance={balance}
          isActiveBoost={isActiveBoost}
          onActivate={activate}
          isPending={isPending}
        />
        <BoostCard
          title={t("featuredTitle")}
          description={t("featuredDescription")}
          cost={400}
          durationHours={72}
          boostType="featured"
          tier={1}
          balance={balance}
          isActiveBoost={isActiveBoost}
          onActivate={activate}
          isPending={isPending}
        />
      </div>

      <Separator />

      {/* Point history */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">{t("historyTitle")}</h3>
        {pointsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : pointsData?.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyHistory")}</p>
        ) : (
          <div className="space-y-2">
            {pointsData?.history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {reasonLabels[item.reason] ?? item.reason}
                  </span>
                  {item.meta.admin_note && (
                    <p className="text-xs text-muted-foreground">
                      {item.meta.admin_note}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={
                      item.delta > 0
                        ? "font-semibold text-green-600"
                        : "font-semibold text-red-500"
                    }
                  >
                    {item.delta > 0 ? "+" : ""}
                    {item.delta}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString(localeTag)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
