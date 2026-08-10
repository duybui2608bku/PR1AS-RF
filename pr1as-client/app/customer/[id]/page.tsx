"use client"

import { use } from "react"
import { AlertCircle, BadgeCheck, CalendarDays, ShieldCheck, User2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { SiteLayout } from "@/components/layout/site-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientPublicProfile } from "@/lib/hooks/use-users"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { getReputationBadgeClass } from "@/lib/utils/reputation"

type PageParams = { id: string }

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = use(params)
  const t = useTranslations("CustomerProfile")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const { data, isLoading, error } = useClientPublicProfile(id)

  const cancelRate =
    data && data.total_count > 0
      ? Math.round((data.client_cancelled_count / data.total_count) * 100)
      : 0
  const memberSince = data
    ? new Intl.DateTimeFormat(localeTag, {
        year: "numeric",
        month: "long",
      }).format(new Date(data.member_since))
    : ""

  return (
    <SiteLayout hideFooter>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {isLoading ? <CustomerProfileSkeleton /> : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
            <AlertDescription>{t("loadErrorDesc")}</AlertDescription>
          </Alert>
        ) : null}

        {data ? (
          <div className="space-y-5 rounded-2xl border p-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 shrink-0">
                {data.avatar ? (
                  <AvatarImage src={data.avatar} alt={data.full_name ?? ""} />
                ) : null}
                <AvatarFallback>
                  <User2 className="size-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <span className="truncate">
                    {data.full_name ?? t("defaultUser")}
                  </span>
                  {data.is_verified ? (
                    <BadgeCheck className="size-5 shrink-0 text-primary" />
                  ) : null}
                </h1>
                {memberSince ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {t("memberSince", { date: memberSince })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  getReputationBadgeClass(data.reputation_score),
                )}
              >
                <ShieldCheck className="size-3.5" />
                {t("reputation", { score: data.reputation_score })}
              </span>
              {data.is_verified ? (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <BadgeCheck className="size-3.5" />
                  {t("verifiedBadge")}
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Stat value={data.total_count} label={t("totalBookings")} />
              <Stat
                value={data.completed_count}
                label={t("completedBookings")}
              />
              <Stat value={`${cancelRate}%`} label={t("cancelRate")} />
            </div>
          </div>
        ) : null}
      </div>
    </SiteLayout>
  )
}

const Stat = ({
  value,
  label,
}: {
  value: number | string
  label: string
}) => (
  <div className="rounded-2xl border bg-card p-4 text-center">
    <p className="text-2xl font-semibold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
)

const CustomerProfileSkeleton = () => (
  <div className="space-y-5 rounded-2xl border p-5">
    <div className="flex items-center gap-4">
      <Skeleton className="size-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
    <Skeleton className="h-6 w-32 rounded-full" />
    <div className="grid grid-cols-3 gap-3">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  </div>
)
