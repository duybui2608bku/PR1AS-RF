"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Save,
  Sparkles,
  Star,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useAdminPricingPackages,
  useUpdatePricingPackage,
} from "@/lib/hooks/use-pricing"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  PricingPackage,
  PricingPlanCode,
  PricingPlanFeatures,
} from "@/services/pricing.service"

type PlanDraft = {
  display_name: string
  price: string
  is_active: boolean
  messaging_enabled: boolean
  messaging_max_recipients: string
  create_job_enabled: boolean
  create_job_limit: string
  boost_profile_enabled: boolean
  boost_profile_monthly_limit: string
  ads_enabled: boolean
}

type LimitKey =
  | "messaging_max_recipients"
  | "create_job_limit"
  | "boost_profile_monthly_limit"

type BooleanDraftKey =
  | "is_active"
  | "messaging_enabled"
  | "create_job_enabled"
  | "boost_profile_enabled"
  | "ads_enabled"

const PLAN_META: Record<
  PricingPlanCode,
  {
    icon: React.ReactNode
    color: string
    bg: string
  }
> = {
  standard: {
    icon: <Zap className="size-4" />,
    color: "text-foreground",
    bg: "bg-muted",
  },
  gold: {
    icon: <Star className="size-4 fill-amber-400 text-amber-400" />,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950/40",
  },
  diamond: {
    icon: <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950/40",
  },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

function parseVndInput(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return Number.NaN
  return Number(digits)
}

function formatVndInput(value: number | string) {
  const digits = String(value).replace(/[^\d]/g, "")
  if (!digits) return ""
  return new Intl.NumberFormat("en-US").format(Number(digits))
}

function limitToInput(value: number | null) {
  return value === null ? "" : String(value)
}

function inputToNullableInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return Number(trimmed)
}

function draftFromPackage(pkg: PricingPackage): PlanDraft {
  return {
    display_name: pkg.display_name,
    price: formatVndInput(pkg.price ?? 0),
    is_active: pkg.is_active,
    messaging_enabled: pkg.features.messaging_enabled,
    messaging_max_recipients: limitToInput(
      pkg.features.messaging_max_recipients
    ),
    create_job_enabled: pkg.features.create_job_enabled,
    create_job_limit: limitToInput(pkg.features.create_job_limit),
    boost_profile_enabled: pkg.features.boost_profile_enabled,
    boost_profile_monthly_limit: limitToInput(
      pkg.features.boost_profile_monthly_limit
    ),
    ads_enabled: pkg.features.ads_enabled,
  }
}

function featuresFromDraft(draft: PlanDraft): PricingPlanFeatures {
  return {
    messaging_enabled: draft.messaging_enabled,
    messaging_max_recipients: draft.messaging_enabled
      ? inputToNullableInt(draft.messaging_max_recipients)
      : null,
    create_job_enabled: draft.create_job_enabled,
    create_job_limit: draft.create_job_enabled
      ? inputToNullableInt(draft.create_job_limit)
      : null,
    boost_profile_enabled: draft.boost_profile_enabled,
    boost_profile_monthly_limit: draft.boost_profile_enabled
      ? inputToNullableInt(draft.boost_profile_monthly_limit)
      : null,
    ads_enabled: draft.ads_enabled,
  }
}

function validateDraft(draft: PlanDraft) {
  const price = parseVndInput(draft.price)
  if (!draft.display_name.trim()) {
    return "Tên gói không được để trống."
  }
  if (!Number.isFinite(price) || price < 0) {
    return "Giá gói phải là số lớn hơn hoặc bằng 0."
  }

  const limits: Array<{ label: string; key: LimitKey; min: number }> = [
    { label: "Số người nhận tin nhắn", key: "messaging_max_recipients", min: 1 },
    { label: "Giới hạn đăng tin", key: "create_job_limit", min: 1 },
    {
      label: "Lượt boost hồ sơ",
      key: "boost_profile_monthly_limit",
      min: 0,
    },
  ]

  for (const item of limits) {
    const value = draft[item.key].trim()
    if (!value) continue
    const numberValue = Number(value)
    if (
      !Number.isInteger(numberValue) ||
      numberValue < item.min
    ) {
      return `${item.label} phải là số nguyên từ ${item.min} trở lên.`
    }
  }

  return null
}

function PackageSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function FeatureToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description?: string
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border bg-background p-4">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

function LimitField({
  id,
  label,
  value,
  disabled,
  min,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  min: number
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        step={1}
        value={value}
        disabled={disabled}
        placeholder="Không giới hạn"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function PlanEditor({
  pkg,
  draft,
  isSaving,
  onChange,
  onSave,
}: {
  pkg: PricingPackage
  draft: PlanDraft
  isSaving: boolean
  onChange: (next: PlanDraft) => void
  onSave: () => void
}) {
  const meta = PLAN_META[pkg.package_code]
  const setBoolean = (key: BooleanDraftKey, value: boolean) => {
    onChange({ ...draft, [key]: value })
  }
  const setField = (key: keyof PlanDraft, value: string) => {
    onChange({ ...draft, [key]: value })
  }

  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg",
                meta.bg,
                meta.color
              )}
            >
              {meta.icon}
            </span>
            <CardTitle className="text-xl">{pkg.display_name}</CardTitle>
            <Badge variant={draft.is_active ? "default" : "outline"}>
              {draft.is_active ? "Đang bật" : "Đã tắt"}
            </Badge>
          </div>
          <CardDescription>
            Mã gói {pkg.package_code.toUpperCase()} · Giá hiện tại{" "}
            {formatCurrency(Number(pkg.price ?? 0))}
          </CardDescription>
        </div>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Lưu thay đổi
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor={`${pkg.id}-name`}>Tên hiển thị</Label>
            <Input
              id={`${pkg.id}-name`}
              value={draft.display_name}
              onChange={(event) =>
                setField("display_name", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${pkg.id}-price`}>Giá mỗi tháng</Label>
            <Input
              id={`${pkg.id}-price`}
              type="text"
              inputMode="numeric"
              value={draft.price}
              placeholder="65,000"
              onChange={(event) =>
                setField("price", formatVndInput(event.target.value))
              }
            />
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border px-3">
            <Checkbox
              checked={draft.is_active}
              onCheckedChange={(value) =>
                setBoolean("is_active", value === true)
              }
            />
            <span className="text-sm font-medium">Bật gói</span>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FeatureToggle
            checked={draft.messaging_enabled}
            label="Nhắn tin với khách hàng"
            description="Cho phép worker chủ động nhắn tin theo giới hạn người nhận."
            onChange={(value) => setBoolean("messaging_enabled", value)}
          />
          <LimitField
            id={`${pkg.id}-message-limit`}
            label="Số người nhận tin nhắn"
            value={draft.messaging_max_recipients}
            min={1}
            disabled={!draft.messaging_enabled}
            onChange={(value) => setField("messaging_max_recipients", value)}
          />

          <FeatureToggle
            checked={draft.create_job_enabled}
            label="Đăng tin"
            description="Cho phép tạo bài đăng hoặc job theo giới hạn của gói."
            onChange={(value) => setBoolean("create_job_enabled", value)}
          />
          <LimitField
            id={`${pkg.id}-job-limit`}
            label="Giới hạn đăng tin"
            value={draft.create_job_limit}
            min={1}
            disabled={!draft.create_job_enabled}
            onChange={(value) => setField("create_job_limit", value)}
          />

          <FeatureToggle
            checked={draft.boost_profile_enabled}
            label="Boost hồ sơ"
            description="Cho phép đẩy hồ sơ worker nổi bật mỗi tháng."
            onChange={(value) => setBoolean("boost_profile_enabled", value)}
          />
          <LimitField
            id={`${pkg.id}-boost-limit`}
            label="Lượt boost mỗi tháng"
            value={draft.boost_profile_monthly_limit}
            min={0}
            disabled={!draft.boost_profile_enabled}
            onChange={(value) =>
              setField("boost_profile_monthly_limit", value)
            }
          />

          <FeatureToggle
            checked={draft.ads_enabled}
            label="Hiển thị quảng cáo"
            description="Tắt mục này nếu gói được hưởng trải nghiệm không quảng cáo."
            onChange={(value) => setBoolean("ads_enabled", value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPricingPage() {
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const packagesQuery = useAdminPricingPackages()
  const updateMutation = useUpdatePricingPackage()

  useEffect(() => {
    if (!packagesQuery.data) return
    setDrafts((current) => {
      const next = { ...current }
      for (const pkg of packagesQuery.data) {
        if (!next[pkg.id]) {
          next[pkg.id] = draftFromPackage(pkg)
        }
      }
      return next
    })
  }, [packagesQuery.data])

  const packages = useMemo(
    () =>
      [...(packagesQuery.data ?? [])].sort(
        (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)
      ),
    [packagesQuery.data]
  )

  const activeCount = packages.filter((pkg) => pkg.is_active).length

  const handleSave = async (pkg: PricingPackage) => {
    const draft = drafts[pkg.id]
    if (!draft) return

    const validationError = validateDraft(draft)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSavingId(pkg.id)
    try {
      await updateMutation.mutateAsync({
        id: pkg.id,
        payload: {
          display_name: draft.display_name.trim(),
          price: parseVndInput(draft.price),
          is_active: draft.is_active,
          features: featuresFromDraft(draft),
        },
      })
      toast.success(`Đã cập nhật gói ${draft.display_name.trim()}.`)
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật gói."))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chỉnh giá, trạng thái và quyền sử dụng của các gói pricing.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => packagesQuery.refetch()}
          disabled={packagesQuery.isFetching}
        >
          {packagesQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Làm mới
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng số plan</CardDescription>
            <CardTitle>{packages.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan đang bật</CardDescription>
            <CardTitle>{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan có nhắn tin</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              {
                packages.filter((pkg) => pkg.features.messaging_enabled)
                  .length
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {packagesQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <PackageSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {packagesQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Không thể tải danh sách plan</CardTitle>
            <CardDescription>
              Vui lòng kiểm tra quyền admin hoặc thử làm mới dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => packagesQuery.refetch()}>
              <RefreshCcw className="size-4" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!packagesQuery.isLoading && !packagesQuery.isError && packages.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có plan</CardTitle>
            <CardDescription>
              Backend sẽ tự tạo các gói mặc định khi API pricing được gọi.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="space-y-4">
        {packages.map((pkg) => {
          const draft = drafts[pkg.id]
          if (!draft) return null
          return (
            <PlanEditor
              key={pkg.id}
              pkg={pkg}
              draft={draft}
              isSaving={savingId === pkg.id}
              onChange={(next) =>
                setDrafts((current) => ({ ...current, [pkg.id]: next }))
              }
              onSave={() => handleSave(pkg)}
            />
          )
        })}
      </div>

      {!packagesQuery.isLoading && packages.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
          Giá trên trang pricing và số tiền trừ ví khi nâng cấp đều dùng giá từ
          database.
        </div>
      ) : null}
    </div>
  )
}
