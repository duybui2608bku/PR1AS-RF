"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  Star,
  StarOff,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  useReputationConfigs,
  useUpdateReputationConfig,
} from "@/lib/hooks/use-reputation-config"
import {
  TOGGLEABLE_REPUTATION_KEYS,
  type ReputationConfig,
  type ReputationConfigKey,
} from "@/services/reputation-config.service"

type ConfigMeta = {
  label: string
  description: string
  icon: React.ReactNode
  unit: string
  hint: string
}

const CONFIG_META: Record<ReputationConfigKey, ConfigMeta> = {
  booking_expiry_deduction: {
    label: "Booking hết hạn",
    description: "Điểm bị trừ khi booking hết hạn mà worker không xác nhận.",
    icon: <Clock className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng mỗi lần booking tự động hết hạn",
  },
  worker_cancel_deduction: {
    label: "Worker hủy booking",
    description: "Điểm bị trừ khi worker chủ động hủy booking đã xác nhận.",
    icon: <XCircle className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng khi worker là bên hủy",
  },
  client_late_cancel_deduction: {
    label: "Client hủy muộn",
    description:
      "Điểm bị trừ khi client hủy booking sát giờ bắt đầu (trong khung giờ miễn phí).",
    icon: <XCircle className="size-4" />,
    unit: "điểm",
    hint: "Chỉ áp dụng khi worker đã nhận và client hủy muộn",
  },
  low_review_deduction: {
    label: "Đánh giá thấp (điểm trừ)",
    description: "Điểm bị trừ khi worker nhận đánh giá dưới ngưỡng sao.",
    icon: <StarOff className="size-4" />,
    unit: "điểm",
    hint: "Kết hợp với ngưỡng đánh giá thấp bên dưới",
  },
  low_review_threshold: {
    label: "Ngưỡng đánh giá thấp",
    description: "Mức sao tối đa bị coi là đánh giá xấu và bị trừ điểm.",
    icon: <Star className="size-4" />,
    unit: "sao",
    hint: "Ví dụ: 2 nghĩa là ≤ 2 sao sẽ bị trừ điểm",
  },
  daily_recovery_points: {
    label: "Phục hồi điểm hàng ngày",
    description: "Số điểm cộng thêm mỗi ngày cho user có điểm danh tiếng dưới 100.",
    icon: <TrendingUp className="size-4" />,
    unit: "điểm/ngày",
    hint: "Chạy lúc 00:00 mỗi ngày qua cron job",
  },
  warning_threshold: {
    label: "Ngưỡng cảnh báo danh tiếng",
    description: "Nếu điểm danh tiếng giảm xuống dưới ngưỡng này, user sẽ nhận thông báo cảnh báo.",
    icon: <AlertTriangle className="size-4" />,
    unit: "điểm",
    hint: "Thông báo gửi khi điểm vượt ngưỡng theo chiều giảm",
  },
}

function ConfigRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <Skeleton className="size-9 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-9 w-20" />
    </div>
  )
}

function ConfigRow({ config }: { config: ReputationConfig }) {
  const meta = CONFIG_META[config.key]
  const updateMutation = useUpdateReputationConfig()
  const [draft, setDraft] = useState<string>(String(config.value))
  const isDirty = draft !== String(config.value)
  const isPending = updateMutation.isPending

  const isToggleable = TOGGLEABLE_REPUTATION_KEYS.includes(config.key)
  // A disabled rule no longer affects scoring — dim the value controls.
  const isDisabledRule = isToggleable && !config.active

  const handleSave = () => {
    const parsed = parseInt(draft, 10)
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return
    updateMutation.mutate({ key: config.key, value: parsed })
  }

  const handleReset = () => setDraft(String(config.value))

  const handleToggleActive = (next: boolean) => {
    updateMutation.mutate({ key: config.key, active: next })
  }

  const isInvalid =
    draft === "" ||
    isNaN(parseInt(draft, 10)) ||
    parseInt(draft, 10) < 0 ||
    parseInt(draft, 10) > 100

  return (
    <div className="rounded-lg border bg-card transition-colors">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
          {meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none">{meta.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
        </div>

        <div
          className={
            "flex items-center gap-2 sm:shrink-0" +
            (isDisabledRule ? " opacity-50" : "")
          }
        >
          <div className="relative flex items-center">
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isDirty && !isInvalid) handleSave()
              }}
              className="h-9 w-24 pr-2 text-center"
              disabled={isPending || isDisabledRule}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {meta.unit}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={!isDirty || isPending || isDisabledRule}
            onClick={handleReset}
            title="Hoàn tác"
          >
            <RotateCcw className="size-3.5" />
            <span className="sr-only">Hoàn tác</span>
          </Button>
          <Button
            size="sm"
            disabled={!isDirty || isInvalid || isPending || isDisabledRule}
            onClick={handleSave}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Lưu
          </Button>
        </div>
      </div>

      <div className="border-t bg-muted/40 px-4 py-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{meta.hint}</p>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <Badge
              variant="outline"
              className="border-amber-400 text-amber-600 dark:text-amber-300 text-xs"
            >
              Chưa lưu
            </Badge>
          ) : config.updated_by ? (
            <span className="text-xs text-muted-foreground">
              Đã sửa {new Date(config.updated_at).toLocaleDateString("vi-VN")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Mặc định</span>
          )}
          {isToggleable ? (
            <div className="flex items-center gap-1.5">
              <span
                className={
                  "text-xs font-medium " +
                  (config.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")
                }
              >
                {config.active ? "Đang bật" : "Đã tắt"}
              </span>
              <Switch
                checked={config.active}
                disabled={isPending}
                onCheckedChange={handleToggleActive}
                aria-label={config.active ? "Tắt quy tắc" : "Bật quy tắc"}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function ReputationConfigPage() {
  const configsQuery = useReputationConfigs()

  const configs = configsQuery.data ?? []

  const orderedKeys: ReputationConfigKey[] = [
    "booking_expiry_deduction",
    "worker_cancel_deduction",
    "client_late_cancel_deduction",
    "low_review_deduction",
    "low_review_threshold",
    "daily_recovery_points",
    "warning_threshold",
  ]

  const orderedConfigs = orderedKeys
    .map((key) => configs.find((c) => c.key === key))
    .filter((c): c is ReputationConfig => !!c)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cấu hình điểm danh tiếng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Điều chỉnh các ngưỡng trừ điểm, cộng điểm và cảnh báo áp dụng trên toàn hệ thống.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => configsQuery.refetch()}
          disabled={configsQuery.isFetching}
        >
          {configsQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Làm mới
        </Button>
      </div>

      {configsQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không thể tải cấu hình</CardTitle>
            <CardDescription>
              Đã xảy ra sự cố khi tải dữ liệu. Vui lòng thử lại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => configsQuery.refetch()}>
              <RefreshCcw className="size-4" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : configsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <ConfigRowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trừ điểm</CardTitle>
              <CardDescription>
                Các sự kiện kích hoạt trừ điểm danh tiếng của worker.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderedConfigs
                .filter((c) =>
                  [
                    "booking_expiry_deduction",
                    "worker_cancel_deduction",
                    "client_late_cancel_deduction",
                    "low_review_deduction",
                    "low_review_threshold",
                  ].includes(c.key)
                )
                .map((config) => (
                  <ConfigRow key={config.key} config={config} />
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cộng điểm & cảnh báo</CardTitle>
              <CardDescription>
                Cấu hình phục hồi điểm hàng ngày và ngưỡng thông báo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderedConfigs
                .filter((c) =>
                  ["daily_recovery_points", "warning_threshold"].includes(c.key)
                )
                .map((config) => (
                  <ConfigRow key={config.key} config={config} />
                ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
