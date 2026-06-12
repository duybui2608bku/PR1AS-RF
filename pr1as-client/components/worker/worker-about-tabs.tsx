"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Cake,
  Gauge,
  Heart,
  Mars,
  Move,
  Quote as QuoteIcon,
  Sparkles,
  Star,
  Venus,
  VenusAndMars,
} from "lucide-react"

import { useTranslations } from "next-intl"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WorkerGender, WorkerProfilePublic } from "@/types"

const GENDER_KEY: Record<WorkerGender, string> = {
  MALE: "enums.genderMale",
  FEMALE: "enums.genderFemale",
  OTHER: "enums.genderOther",
}

const calculateAge = (dob?: string | null): number | null => {
  if (!dob) return null
  const date = new Date(dob)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const m = now.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1
  return age
}

const GenderIcon = ({ gender }: { gender?: WorkerGender }) => {
  if (gender === "MALE") return <Mars className="size-4 text-blue-500" />
  if (gender === "FEMALE") return <Venus className="size-4 text-pink-500" />
  return <VenusAndMars className="size-4 text-muted-foreground" />
}

type InfoRow = {
  icon: LucideIcon
  iconClass?: string
  label: string
  value: string
  /** Optional custom leading node (overrides icon). */
  leading?: ReactNode
}

type Props = {
  profile: WorkerProfilePublic | null
}

/**
 * Mobile-only tabbed "about" section shown directly below the worker
 * introduction. Groups personal details, lifestyle and quote into a
 * segmented-control style set of tabs for an app-like feel.
 */
export function WorkerAboutTabs({ profile }: Props) {
  const t = useTranslations("WorkerProfile")
  const age = calculateAge(profile?.date_of_birth)

  const infoRows: InfoRow[] = [
    {
      icon: Cake,
      iconClass: "text-rose-400",
      label: t("about.age"),
      value: age !== null ? t("about.ageValue", { age }) : "—",
    },
    {
      icon: VenusAndMars,
      label: t("about.gender"),
      value: profile?.gender ? t(GENDER_KEY[profile.gender]) : "—",
      leading: <GenderIcon gender={profile?.gender} />,
    },
    {
      icon: Move,
      iconClass: "text-emerald-500",
      label: t("about.height"),
      value: profile?.height_cm ? `${profile.height_cm} cm` : "—",
    },
    {
      icon: Gauge,
      iconClass: "text-sky-500",
      label: t("about.weight"),
      value: profile?.weight_kg ? `${profile.weight_kg} kg` : "—",
    },
    {
      icon: Star,
      iconClass: "text-amber-400",
      label: t("about.starSign"),
      value: profile?.star_sign?.trim() || "—",
    },
  ]

  const lifestyle = profile?.lifestyle?.trim()
  const quote = profile?.quote?.trim()

  return (
    <div className="lg:hidden">
      <Tabs defaultValue="info" className="gap-3">
        <TabsList className="h-10 w-full rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="info" className="rounded-lg text-xs">
            <Sparkles className="size-3.5" />
            {t("about.tabInfo")}
          </TabsTrigger>
          <TabsTrigger value="lifestyle" className="rounded-lg text-xs">
            <Heart className="size-3.5" />
            {t("about.tabLifestyle")}
          </TabsTrigger>
          <TabsTrigger value="quote" className="rounded-lg text-xs">
            <QuoteIcon className="size-3.5" />
            {t("about.tabQuote")}
          </TabsTrigger>
        </TabsList>

        {/* ── Personal info ── */}
        <TabsContent value="info">
          <div className="grid grid-cols-2 gap-2.5">
            {infoRows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-2.5 rounded-2xl border bg-card p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {row.leading ?? (
                      <Icon className={row.iconClass ?? "text-muted-foreground"} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {row.value}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Lifestyle ── */}
        <TabsContent value="lifestyle">
          <div className="rounded-2xl border bg-card p-4">
            {lifestyle ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {lifestyle}
              </p>
            ) : (
              <EmptyState icon={Heart} text={t("about.noLifestyle")} />
            )}
          </div>
        </TabsContent>

        {/* ── Quote ── */}
        <TabsContent value="quote">
          <div className="rounded-2xl border bg-card p-4">
            {quote ? (
              <blockquote className="relative pl-7 text-sm italic leading-relaxed whitespace-pre-line text-muted-foreground">
                <QuoteIcon className="absolute left-0 top-0.5 size-5 text-rose-300" />
                {quote}
              </blockquote>
            ) : (
              <EmptyState icon={QuoteIcon} text={t("about.noQuote")} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon className="size-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
