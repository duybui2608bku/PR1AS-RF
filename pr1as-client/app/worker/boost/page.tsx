"use client"

import * as React from "react"
import { Coins } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { AttendanceWidget } from "@/components/worker/attendance-widget"
import { BoostPanel } from "@/components/worker/boost-panel"
import { Card, CardContent } from "@/components/ui/card"
import { boostService } from "@/services/boost.service"
import { queryKeys } from "@/lib/query-keys"

export default function WorkerBoostPage() {
  const t = useTranslations("WorkerBoost.page")
  const { data: pointsData } = useQuery({
    queryKey: queryKeys.boostPoints,
    queryFn: () => boostService.getPoints(10, 0),
  })

  const balance = pointsData?.wallet.balance ?? 0

  return (
    <AuthGuard>
      <SiteLayout>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>

          {/* Balance card */}
          <Card className="bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium opacity-90">
                  {t("currentPoints")}
                </p>
                <p className="text-3xl font-bold">{balance}</p>
              </div>
            </CardContent>
          </Card>

          {/* Daily check-in */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t("dailyCheckIn")}
            </h2>
            <AttendanceWidget />
          </div>

          {/* How to earn */}
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="mb-2 font-medium">{t("earnTitle")}</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                {t.rich("earnDaily", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich("earnWeekly", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich("earnMonthly", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich("earnGold", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li>
                {t.rich("earnDiamond", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
          </div>

          {/* Boost options */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t("activateBoost")}
            </h2>
            <BoostPanel />
          </div>
        </div>
      </SiteLayout>
    </AuthGuard>
  )
}
