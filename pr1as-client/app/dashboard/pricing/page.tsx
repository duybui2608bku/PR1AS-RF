"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Loader2,
  Megaphone,
  MessageSquare,
  PenSquare,
  RefreshCcw,
  RotateCcw,
  Rocket,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    label: string
    accent: string
  }
> = {
  standard: {
    icon: <Zap className="size-4" />,
    label: "Standard",
    accent: "text-foreground",
  },
  gold: {
    icon: <Star className="size-4 fill-amber-400 text-amber-400" />,
    label: "Gold",
    accent: "text-amber-600 dark:text-amber-300",
  },
  diamond: {
    icon: <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />,
    label: "Diamond",
    accent: "text-violet-600 dark:text-violet-300",
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

function isDraftEqual(a: PlanDraft, b: PlanDraft) {
  return (
    a.display_name === b.display_name &&
    a.price === b.price &&
    a.is_active === b.is_active &&
    a.messaging_enabled === b.messaging_enabled &&
    a.messaging_max_recipients === b.messaging_max_recipients &&
    a.create_job_enabled === b.create_job_enabled &&
    a.create_job_limit === b.create_job_limit &&
    a.boost_profile_enabled === b.boost_profile_enabled &&
    a.boost_profile_monthly_limit === b.boost_profile_monthly_limit &&
    a.ads_enabled === b.ads_enabled
  )
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
    { label: "Lượt boost hồ sơ", key: "boost_profile_monthly_limit", min: 0 },
  ]

  for (const item of limits) {
    const value = draft[item.key].trim()
    if (!value) continue
    const numberValue = Number(value)
    if (!Number.isInteger(numberValue) || numberValue < item.min) {
      return `${item.label} phải là số nguyên từ ${item.min} trở lên.`
    }
  }

  return null
}

function PageHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-[420px] w-full" />
    </div>
  )
}

function FeatureRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  limit,
}: {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: (value: boolean) => void
  limit?: {
    id: string
    label: string
    value: string
    placeholder?: string
    min: number
    onChange: (value: string) => void
  }
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex size-8 items-center justify-center rounded-md border bg-muted text-muted-foreground",
              enabled && "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {icon}
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium leading-none">{title}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {limit ? (
        <div
          className={cn(
            "flex flex-col gap-2 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
            !enabled && "opacity-60"
          )}
        >
          <Label
            htmlFor={limit.id}
            className="text-xs font-normal text-muted-foreground"
          >
            {limit.label}
          </Label>
          <Input
            id={limit.id}
            type="number"
            min={limit.min}
            step={1}
            value={limit.value}
            disabled={!enabled}
            placeholder={limit.placeholder ?? "Không giới hạn"}
            onChange={(event) => limit.onChange(event.target.value)}
            className="h-9 w-full bg-background sm:max-w-[200px]"
          />
        </div>
      ) : null}
    </div>
  )
}

function PlanEditor({
  pkg,
  draft,
  baseline,
  isSaving,
  onChange,
  onReset,
  onSave,
}: {
  pkg: PricingPackage
  draft: PlanDraft
  baseline: PlanDraft
  isSaving: boolean
  onChange: (next: PlanDraft) => void
  onReset: () => void
  onSave: () => void
}) {
  const meta = PLAN_META[pkg.package_code]
  const setBoolean = (key: BooleanDraftKey, value: boolean) => {
    onChange({ ...draft, [key]: value })
  }
  const setField = (key: keyof PlanDraft, value: string) => {
    onChange({ ...draft, [key]: value })
  }
  const isDirty = !isDraftEqual(draft, baseline)

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-2", meta.accent)}>
            {meta.icon}
            <CardTitle className="text-lg">Gói {meta.label}</CardTitle>
          </span>
          <Badge variant={draft.is_active ? "default" : "outline"}>
            {draft.is_active ? "Đang bật" : "Đã tắt"}
          </Badge>
          {isDirty ? (
            <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-300">
              <AlertCircle className="size-3" />
              Chưa lưu
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Thông tin gói</h3>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hiển thị cho user</span>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(value) => setBoolean("is_active", value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${pkg.id}-name`}>Tên hiển thị</Label>
              <Input
                id={`${pkg.id}-name`}
                value={draft.display_name}
                placeholder={meta.label}
                onChange={(event) =>
                  setField("display_name", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${pkg.id}-price`}>Giá / tháng (VND)</Label>
              <Input
                id={`${pkg.id}-price`}
                type="text"
                inputMode="numeric"
                value={draft.price}
                placeholder="0"
                onChange={(event) =>
                  setField("price", formatVndInput(event.target.value))
                }
              />
              {Number.isFinite(parseVndInput(draft.price)) ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(parseVndInput(draft.price) || 0)}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Quyền sử dụng</h3>
            <p className="text-xs text-muted-foreground">
              Bật / tắt từng tính năng. Khi bật, có thể đặt giới hạn (để trống
              = không giới hạn).
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <FeatureRow
              icon={<MessageSquare className="size-4" />}
              title="Nhắn tin với khách hàng"
              description="Cho phép worker chủ động nhắn tin tới khách."
              enabled={draft.messaging_enabled}
              onToggle={(value) => setBoolean("messaging_enabled", value)}
              limit={{
                id: `${pkg.id}-message-limit`,
                label: "Số người nhận tối đa",
                value: draft.messaging_max_recipients,
                min: 1,
                onChange: (value) =>
                  setField("messaging_max_recipients", value),
              }}
            />

            <FeatureRow
              icon={<PenSquare className="size-4" />}
              title="Đăng tin"
              description="Cho phép tạo bài đăng / job theo giới hạn của gói."
              enabled={draft.create_job_enabled}
              onToggle={(value) => setBoolean("create_job_enabled", value)}
              limit={{
                id: `${pkg.id}-job-limit`,
                label: "Số tin được đăng",
                value: draft.create_job_limit,
                min: 1,
                onChange: (value) => setField("create_job_limit", value),
              }}
            />

            <FeatureRow
              icon={<Rocket className="size-4" />}
              title="Boost hồ sơ"
              description="Đẩy hồ sơ worker nổi bật trong tháng."
              enabled={draft.boost_profile_enabled}
              onToggle={(value) => setBoolean("boost_profile_enabled", value)}
              limit={{
                id: `${pkg.id}-boost-limit`,
                label: "Lượt boost / tháng",
                value: draft.boost_profile_monthly_limit,
                min: 0,
                onChange: (value) =>
                  setField("boost_profile_monthly_limit", value),
              }}
            />

            <FeatureRow
              icon={<Megaphone className="size-4" />}
              title="Hiển thị quảng cáo"
              description="Tắt mục này nếu gói được trải nghiệm không quảng cáo."
              enabled={draft.ads_enabled}
              onToggle={(value) => setBoolean("ads_enabled", value)}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t pt-4 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            disabled={!isDirty || isSaving}
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Hoàn tác
          </Button>
          <Button onClick={onSave} disabled={!isDirty || isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Lưu thay đổi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPricingPage() {
  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, PlanDraft>
  >({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [tabSelection, setTabSelection] = useState<string>("")
  const packagesQuery = useAdminPricingPackages()
  const updateMutation = useUpdatePricingPackage()

  const packages = useMemo(
    () =>
      [...(packagesQuery.data ?? [])].sort(
        (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)
      ),
    [packagesQuery.data]
  )

  const baselines = useMemo<Record<string, PlanDraft>>(() => {
    const next: Record<string, PlanDraft> = {}
    for (const pkg of packages) {
      next[pkg.id] = draftFromPackage(pkg)
    }
    return next
  }, [packages])

  const activeTab =
    tabSelection && packages.some((p) => p.id === tabSelection)
      ? tabSelection
      : (packages[0]?.id ?? "")

  const dirtyIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pkg of packages) {
      const override = draftOverrides[pkg.id]
      const baseline = baselines[pkg.id]
      if (override && baseline && !isDraftEqual(override, baseline)) {
        ids.add(pkg.id)
      }
    }
    return ids
  }, [packages, draftOverrides, baselines])

  const handleSave = async (pkg: PricingPackage) => {
    const draft = draftOverrides[pkg.id] ?? baselines[pkg.id]
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
      setDraftOverrides((current) => {
        if (!(pkg.id in current)) return current
        const next = { ...current }
        delete next[pkg.id]
        return next
      })
      toast.success(`Đã cập nhật gói ${draft.display_name.trim()}.`)
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật gói."))
    } finally {
      setSavingId(null)
    }
  }

  const handleReset = (pkg: PricingPackage) => {
    setDraftOverrides((current) => {
      if (!(pkg.id in current)) return current
      const next = { ...current }
      delete next[pkg.id]
      return next
    })
  }

  if (packagesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý gói đăng kí</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
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

      {!packagesQuery.isError && packages.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có plan</CardTitle>
            <CardDescription>
              Backend sẽ tự tạo các gói mặc định khi API pricing được gọi.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {packages.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setTabSelection} className="gap-4">
          <TabsList className="h-auto w-full justify-start gap-1 bg-muted p-1 sm:w-fit">
            {packages.map((pkg) => {
              const meta = PLAN_META[pkg.package_code]
              const isDirty = dirtyIds.has(pkg.id)
              return (
                <TabsTrigger
                  key={pkg.id}
                  value={pkg.id}
                  className="h-9 gap-2 px-3"
                >
                  <span className={meta.accent}>{meta.icon}</span>
                  <span>{meta.label}</span>
                  {!pkg.is_active ? (
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  ) : null}
                  {isDirty ? (
                    <span className="size-1.5 rounded-full bg-amber-500" />
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {packages.map((pkg) => {
            const baseline = baselines[pkg.id]
            if (!baseline) return null
            const draft = draftOverrides[pkg.id] ?? baseline
            return (
              <TabsContent key={pkg.id} value={pkg.id} className="mt-0">
                <PlanEditor
                  pkg={pkg}
                  draft={draft}
                  baseline={baseline}
                  isSaving={savingId === pkg.id}
                  onChange={(next) =>
                    setDraftOverrides((current) => ({
                      ...current,
                      [pkg.id]: next,
                    }))
                  }
                  onReset={() => handleReset(pkg)}
                  onSave={() => handleSave(pkg)}
                />
              </TabsContent>
            )
          })}
        </Tabs>
      ) : null}
    </div>
  )
}
