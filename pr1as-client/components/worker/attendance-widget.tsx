"use client"

import * as React from "react"
import { Flame, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"

import { boostService } from "@/services/boost.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { queryKeys } from "@/lib/query-keys"

export function AttendanceWidget() {
  const t = useTranslations("WorkerBoost.attendance")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.boostPoints,
    queryFn: () => boostService.getPoints(1, 0),
  })

  const wallet = data?.wallet

  const { mutate: checkIn, isPending } = useMutation({
    mutationFn: () => boostService.checkIn(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boostPoints })
      if (result.already_checked_in) {
        toast.info(t("alreadyCheckedIn"))
        return
      }
      const parts: string[] = [
        t("pointsEarned", { points: result.points_earned }),
      ]
      if (result.streak_bonus_earned > 0) {
        parts.push(t("streakBonus", { points: result.streak_bonus_earned }))
      }
      if (result.monthly_bonus_earned > 0) {
        parts.push(t("monthlyBonus", { points: result.monthly_bonus_earned }))
      }
      toast.success(t("success", { details: parts.join(" ") }))
    },
    onError: () => toast.error(t("error")),
  })

  const today = new Date().toDateString()
  const lastDate = wallet?.last_attendance_date
    ? new Date(wallet.last_attendance_date).toDateString()
    : null
  const checkedInToday = lastDate === today

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {t("streakLabel")}{" "}
              <span className="font-bold">
                {isLoading
                  ? "..."
                  : t("streakValue", {
                      days: wallet?.attendance_streak ?? 0,
                    })}
              </span>
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {t("balanceLabel")}{" "}
              <span className="font-semibold">
                {isLoading ? "..." : (wallet?.balance ?? 0)}
              </span>
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant={checkedInToday ? "outline" : "default"}
          className={
            checkedInToday
              ? "border-green-400 text-green-700 dark:border-green-600 dark:text-green-400"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }
          disabled={isPending || isLoading || checkedInToday}
          onClick={() => checkIn()}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : checkedInToday ? (
            <CheckCircle2 className="mr-1 h-4 w-4" />
          ) : null}
          {checkedInToday ? t("checkedInButton") : t("checkInButton")}
        </Button>
      </CardContent>
    </Card>
  )
}
