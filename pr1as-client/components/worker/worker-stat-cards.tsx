import type { LucideIcon } from "lucide-react"
import { Gauge, Move, Star, User } from "lucide-react"
import { useTranslations } from "next-intl"

import { Card, CardContent } from "@/components/ui/card"
import type { WorkerProfilePublic } from "@/types"

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

type StatItem = {
  icon: LucideIcon
  label: string
  value: string
}

type Props = {
  profile: WorkerProfilePublic | null
}

export function WorkerStatCards({ profile }: Props) {
  const t = useTranslations("WorkerProfile")
  const age = calculateAge(profile?.date_of_birth)

  const stats: StatItem[] = [
    {
      icon: User,
      label: t("about.age"),
      value: age !== null ? t("about.ageValue", { age }) : "—",
    },
    {
      icon: Move,
      label: t("about.height"),
      value: profile?.height_cm ? `${profile.height_cm} cm` : "—",
    },
    {
      icon: Gauge,
      label: t("about.weight"),
      value: profile?.weight_kg ? `${profile.weight_kg} kg` : "—",
    },
    {
      icon: Star,
      label: t("about.starSign"),
      value: profile?.star_sign ?? "—",
    },
  ]

  return (
    // Desktop only — on mobile these stats live inside WorkerAboutTabs.
    // Grouped into the main column, so 2×2 on lg and 4-across on xl.
    <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <Card key={s.label}>
            <CardContent className="p-4">
              <Icon className="size-5 text-rose-400" />
              <p className="mt-2 text-base font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
