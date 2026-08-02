"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Clock,
  Flag,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldAlert,
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
  profile_photos_bonus: {
    label: "Đủ ảnh hồ sơ",
    description: "Điểm cộng khi worker có đủ số ảnh tối thiểu trong thư viện ảnh.",
    icon: <ImageIcon className="size-4" />,
    unit: "điểm",
    hint: "Cộng một lần khi đạt ngưỡng số ảnh tối thiểu bên dưới",
  },
  min_profile_photos_threshold: {
    label: "Số ảnh tối thiểu",
    description: "Số ảnh tối thiểu trong hồ sơ để được cộng điểm ảnh.",
    icon: <ImageIcon className="size-4" />,
    unit: "ảnh",
    hint: "Không thể tắt — luôn được áp dụng khi tính điểm hồ sơ",
  },
  profile_info_field_bonus: {
    label: "Mỗi trường thông tin hồ sơ",
    description: "Điểm cộng cho mỗi trường thông tin hồ sơ được điền (tối đa 10 trường).",
    icon: <CheckCircle2 className="size-4" />,
    unit: "điểm/trường",
    hint: "Tính lại mỗi khi worker cập nhật hồ sơ",
  },
  review_received_bonus: {
    label: "Nhận được đánh giá",
    description: "Điểm cộng cho worker mỗi khi nhận một đánh giá mới, bất kể số sao.",
    icon: <Star className="size-4" />,
    unit: "điểm",
    hint: "Cộng một lần cho mỗi đánh giá hợp lệ",
  },
  five_star_review_bonus: {
    label: "Đánh giá 5 sao",
    description: "Điểm cộng thêm khi đánh giá nhận được là 5 sao.",
    icon: <Star className="size-4" />,
    unit: "điểm",
    hint: "Cộng thêm, ngoài điểm nhận đánh giá ở trên",
  },
  job_completion_bonus: {
    label: "Hoàn thành job",
    description: "Điểm cộng khi một booking worker thực hiện chuyển sang hoàn thành.",
    icon: <CheckCircle2 className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng cho mọi booking hoàn thành, kể cả tự động hoàn thành",
  },
  report_filed_valid_bonus: {
    label: "Báo cáo vi phạm đúng",
    description: "Điểm cộng khi báo cáo do worker gửi được admin xác nhận đúng.",
    icon: <Flag className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng khi worker là người báo cáo",
  },
  reported_valid_penalty: {
    label: "Bị báo cáo đúng",
    description: "Điểm bị trừ khi báo cáo nhắm vào worker được admin xác nhận đúng.",
    icon: <ShieldAlert className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng khi worker là đối tượng bị báo cáo",
  },
  late_completion_penalty: {
    label: "Trễ hoàn thành",
    description: "Điểm bị trừ khi booking đã bắt đầu nhưng worker quên bấm hoàn thành, hệ thống tự động đóng.",
    icon: <Clock className="size-4" />,
    unit: "điểm",
    hint: "Chỉ áp dụng khi booking đã ở trạng thái đang thực hiện",
  },
  cancel_medium_penalty: {
    label: "Huỷ lịch (30 phút - 2 giờ)",
    description: "Điểm bị trừ khi worker huỷ booking còn 30 phút đến 2 giờ là tới giờ hẹn.",
    icon: <CalendarX className="size-4" />,
    unit: "điểm",
    hint: "Mức nhẹ hơn trong 3 mức phạt huỷ lịch",
  },
  cancel_severe_penalty: {
    label: "Huỷ lịch (dưới 30 phút)",
    description: "Điểm bị trừ khi worker huỷ booking khi còn chưa tới 30 phút là tới giờ hẹn.",
    icon: <CalendarX className="size-4" />,
    unit: "điểm",
    hint: "Mức nặng hơn trong 3 mức phạt huỷ lịch",
  },
  cancel_noshow_penalty: {
    label: "Bom lịch",
    description: "Điểm bị trừ khi dispute worker không đến (no-show) được admin xác nhận đúng.",
    icon: <XCircle className="size-4" />,
    unit: "điểm",
    hint: "Mức nặng nhất trong các quy tắc huỷ/không đến",
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
    "client_late_cancel_deduction",
    "low_review_deduction",
    "low_review_threshold",
    "daily_recovery_points",
    "warning_threshold",
    "profile_photos_bonus",
    "min_profile_photos_threshold",
    "profile_info_field_bonus",
    "review_received_bonus",
    "five_star_review_bonus",
    "job_completion_bonus",
    "report_filed_valid_bonus",
    "reported_valid_penalty",
    "late_completion_penalty",
    "cancel_medium_penalty",
    "cancel_severe_penalty",
    "cancel_noshow_penalty",
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
          aria-label="Làm mới"
          title="Làm mới"
        >
          {configsQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
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
                    "reported_valid_penalty",
                    "late_completion_penalty",
                    "cancel_medium_penalty",
                    "cancel_severe_penalty",
                    "cancel_noshow_penalty",
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
                Cấu hình phục hồi điểm hàng ngày, điểm cộng hồ sơ/hoạt động và ngưỡng thông báo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderedConfigs
                .filter((c) =>
                  [
                    "daily_recovery_points",
                    "warning_threshold",
                    "profile_photos_bonus",
                    "min_profile_photos_threshold",
                    "profile_info_field_bonus",
                    "review_received_bonus",
                    "five_star_review_bonus",
                    "job_completion_bonus",
                    "report_filed_valid_bonus",
                  ].includes(c.key)
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
