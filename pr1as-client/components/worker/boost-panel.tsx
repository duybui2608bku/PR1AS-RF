"use client"

import * as React from "react"
import { Zap, Star, Clock, Coins, Loader2, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { boostService, type BoostType } from "@/services/boost.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { queryKeys } from "@/lib/query-keys"

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
          <Badge variant={isFeatured ? "default" : "secondary"} className="text-xs">
            {isFeatured ? "Nổi bật" : "Cơ bản"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <Coins className="h-4 w-4 text-amber-500" />
            {cost} điểm
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {durationHours} giờ
          </span>
        </div>
        {!canAfford && (
          <p className="text-xs text-destructive">Không đủ điểm (cần thêm {cost - balance} điểm)</p>
        )}
        <Button
          size="sm"
          className="w-full"
          variant={isFeatured ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onActivate(boostType)}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isActiveBoost ? "Đang có boost chạy" : !canAfford ? "Không đủ điểm" : "Kích hoạt"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BoostPanel() {
  const queryClient = useQueryClient()

  const { data: pointsData, isLoading: pointsLoading } = useQuery({
    queryKey: queryKeys.boostPoints,
    queryFn: () => boostService.getPoints(10, 0),
  })

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: queryKeys.boostStatus,
    queryFn: () => boostService.getStatus(),
    refetchInterval: 30_000,
  })

  const { mutate: activate, isPending } = useMutation({
    mutationFn: (boostType: BoostType) => boostService.activateBoost(boostType),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boostPoints })
      queryClient.invalidateQueries({ queryKey: queryKeys.boostStatus })
      toast.success(
        `Boost ${result.boost_type === "featured" ? "Nổi bật" : "Cơ bản"} đã kích hoạt! Còn hiệu lực đến ${new Date(result.expires_at).toLocaleString("vi-VN")}`
      )
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Không thể kích hoạt boost"
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
                Boost đang chạy:{" "}
                <span className="capitalize">
                  {status.boost_type === "featured" ? "Nổi bật" : "Cơ bản"}
                </span>
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                Hết hạn{" "}
                {formatDistanceToNow(new Date(status.expires_at), {
                  addSuffix: true,
                  locale: vi,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boost options */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BoostCard
          title="Boost Cơ bản"
          description="Hồ sơ xuất hiện ở vị trí ưu tiên trong kết quả tìm kiếm, hiển thị badge 'Đang hoạt động'."
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
          title="Boost Nổi bật"
          description="Hồ sơ luôn đứng đầu kết quả, viền vàng nổi bật và badge 'Nổi bật' thu hút client."
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
        <h3 className="mb-3 text-sm font-semibold">Lịch sử điểm gần đây</h3>
        {pointsLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : pointsData?.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch điểm nào</p>
        ) : (
          <div className="space-y-2">
            {pointsData?.history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{reasonLabel(item.reason)}</span>
                  {item.meta.admin_note && (
                    <p className="text-xs text-muted-foreground">{item.meta.admin_note}</p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={
                      item.delta > 0 ? "font-semibold text-green-600" : "font-semibold text-red-500"
                    }
                  >
                    {item.delta > 0 ? "+" : ""}
                    {item.delta}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
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

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    attendance: "Điểm danh hàng ngày",
    attendance_streak_bonus: "Bonus chuỗi điểm danh",
    attendance_monthly_bonus: "Bonus 30 ngày liên tiếp",
    gold_package: "Đăng ký gói Gold",
    diamond_package: "Đăng ký gói Diamond",
    boost_spend: "Kích hoạt Boost",
    admin_adjust: "Điều chỉnh bởi Admin",
  }
  return map[reason] ?? reason
}
