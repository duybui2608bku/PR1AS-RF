"use client"

import {
  AlertTriangle,
  Heart,
  Loader2,
  Mars,
  Pencil,
  ShieldCheck,
  Star,
  Trophy,
  Venus,
  VenusAndMars,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getReputationBadgeClass, getReputationScore } from "@/lib/utils/reputation"
import { WorkerReportButton } from "@/components/worker/worker-report-button"
import type { WorkerDetail, WorkerExperience, WorkerGender } from "@/types"

const EXPERIENCE_KEY: Record<WorkerExperience, string> = {
  LESS_THAN_1: "enums.expLessThan1",
  ONE_TO_3: "enums.exp1To3",
  THREE_TO_5: "enums.exp3To5",
  FIVE_TO_10: "enums.exp5To10",
  MORE_THAN_10: "enums.expMoreThan10",
}

const GENDER_KEY: Record<WorkerGender, string> = {
  MALE: "enums.genderMale",
  FEMALE: "enums.genderFemale",
  OTHER: "enums.genderOther",
}

const GenderIcon = ({ gender }: { gender?: WorkerGender }) => {
  if (gender === "MALE") return <Mars className="size-3.5 text-blue-500" />
  if (gender === "FEMALE") return <Venus className="size-3.5 text-pink-500" />
  return <VenusAndMars className="size-3.5 text-muted-foreground" />
}

type Props = {
  worker: WorkerDetail
  isOwnProfile?: boolean
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: () => void
  onQuickBook?: () => void
  hasOpenReport?: boolean
  onReport?: () => void
}

export function WorkerProfileHeader({
  worker,
  isOwnProfile = false,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
  onQuickBook,
  hasOpenReport = false,
  onReport,
}: Props) {
  const router = useRouter()
  const t = useTranslations("WorkerProfile")
  const profile = worker.worker_profile
  const stats = worker.review_stats
  const ratingAverage = stats?.average ?? 0
  const ratingCount = stats?.total ?? 0

  const gallery: string[] = profile?.gallery_urls ?? []
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = gallery[activeIndex] ?? gallery[0] ?? null

  const fullName = worker.user.full_name ?? t("header.notUpdated")
  const ratingLabel =
    ratingCount > 0
      ? t("header.reviewsCount", { count: ratingCount })
      : t("header.noReviews")
  const title = profile?.title ?? null
  const reputationScore = getReputationScore(worker.user.meta_data?.reputation_score)
  const isLowReputation = reputationScore < 30

  return (
    <div className="space-y-4">
      {isLowReputation ? (
        <Alert className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="size-4 text-red-500" />
          <AlertDescription className="font-medium">
            {t("header.lowReputationWarning", { score: reputationScore })}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ─── MOBILE HERO (hidden on lg+) ─── */}
      <div className="lg:hidden space-y-3">
        {/* Hero image with gradient overlay */}
        <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[4/5] sm:aspect-[3/2]">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={fullName}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("header.noImage")}
            </div>
          )}

          {/* Gradient for text readability */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

          {/* Top-right action */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            {isOwnProfile ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 hover:text-white"
                onClick={() => router.push("/worker/setup")}
              >
                <Pencil className="size-3.5" />
                {t("header.edit")}
              </Button>
            ) : (
              <>
                {onToggleFavorite ? (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    disabled={isFavoritePending}
                    aria-label={
                      isFavorite
                        ? t("header.removeFavorite")
                        : t("header.favorite")
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                      isFavorite
                        ? "bg-rose-500/90 text-white"
                        : "border border-white/40 bg-white/20 text-white hover:bg-white/30",
                    )}
                  >
                    {isFavoritePending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Heart
                        className={cn(
                          "size-3.5 transition-all",
                          isFavorite && "fill-white",
                        )}
                      />
                    )}
                    {/* <span>{isFavorite ? "Đã thích" : "Yêu thích"}</span> */}
                  </button>
                ) : null}
                {onQuickBook ? (
                  <Button
                    type="button"
                    className="gap-1.5"
                    onClick={onQuickBook}
                  >
                    {t("services.book")}
                  </Button>
                ) : null}
                {onReport ? (
                  <WorkerReportButton
                    variant="overlay"
                    hasOpenReport={hasOpenReport}
                    onReport={onReport}
                  />
                ) : null}
              </>
            )}
          </div>

          {/* Bottom overlay: name + rating */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
              {fullName}
            </h1>
            {title ? (
              <p className="mt-0.5 text-sm text-white/80">{title}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < Math.round(ratingAverage)
                        ? "size-4 fill-amber-400 text-amber-400"
                        : "size-4 fill-white/25 text-transparent"
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-white/80">
                {ratingLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Gallery thumbnails */}
        {gallery.length > 1 ? (
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {gallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                  index === activeIndex
                    ? "border-primary shadow-sm"
                    : "border-transparent opacity-55 hover:opacity-90",
                )}
                aria-label={t("header.imageAlt", { index: index + 1 })}
              >
                <Image src={url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {/* Meta: reputation + gender + experience */}
        <div className="space-y-2.5 px-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                getReputationBadgeClass(reputationScore),
              )}
            >
              <ShieldCheck className="size-3.5" />
              {t("header.reputation", { score: reputationScore })}
            </span>

            {profile?.gender ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                <GenderIcon gender={profile.gender} />
                {t(GENDER_KEY[profile.gender])}
              </span>
            ) : null}

            {profile?.experience ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                <Trophy className="size-3 text-amber-500" />
                {t(EXPERIENCE_KEY[profile.experience])}
              </span>
            ) : null}
          </div>

          {profile?.hobbies && profile.hobbies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.hobbies.map((hobby, i) => (
                <Badge
                  key={`${hobby}-${i}`}
                  variant="secondary"
                  className="rounded-full font-normal"
                >
                  {hobby}
                </Badge>
              ))}
            </div>
          ) : null}

          {profile?.introduction ? (
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {profile.introduction}
            </p>
          ) : null}
        </div>
      </div>

      {/* ─── DESKTOP LAYOUT (hidden below lg) ─── */}
      <div className="hidden lg:block space-y-4 rounded-2xl border p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
          {/* Image + gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-muted">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={fullName}
                  fill
                  sizes="(min-width: 1024px) 400px, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  Chưa có ảnh
                </div>
              )}
            </div>

            {gallery.length > 1 ? (
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                {gallery.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                      index === activeIndex
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    aria-label={t("header.imageAlt", { index: index + 1 })}
                  >
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {/* Name + action */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-bold leading-tight tracking-tight">
                  {fullName}
                </h1>
                {title ? (
                  <p className="text-base text-muted-foreground">{title}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {isOwnProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push("/worker/setup")}
                  >
                    <Pencil className="size-3.5" />
                    {t("header.edit")}
                  </Button>
                ) : (
                  <>
                    {onToggleFavorite ? (
                      <button
                        type="button"
                        onClick={onToggleFavorite}
                        disabled={isFavoritePending}
                        aria-label={
                      isFavorite
                        ? t("header.removeFavorite")
                        : t("header.favorite")
                    }
                        title={
                          isFavorite
                            ? t("header.removeFavorite")
                            : t("header.addToFavorite")
                        }
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                          isFavorite
                            ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60"
                            : "border-border bg-background text-muted-foreground hover:border-rose-300 hover:text-rose-500",
                        )}
                      >
                        {isFavoritePending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Heart
                            className={cn(
                              "size-3.5 transition-all",
                              isFavorite
                                ? "fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400"
                                : "text-current",
                            )}
                          />
                        )}
                      </button>
                    ) : null}
                    {onQuickBook ? (
                      <Button type="button" size="sm" onClick={onQuickBook}>
                        {t("services.book")}
                      </Button>
                    ) : null}
                    {onReport ? (
                      <WorkerReportButton
                        hasOpenReport={hasOpenReport}
                        onReport={onReport}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Rating + reputation */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < Math.round(ratingAverage)
                        ? "size-4 fill-amber-400 text-amber-400"
                        : "size-4 text-muted-foreground/30"
                    }
                  />
                ))}
              </div>
              <span>
                {ratingLabel}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  getReputationBadgeClass(reputationScore),
                )}
              >
                <ShieldCheck className="size-3.5" />
                {t("header.reputation", { score: reputationScore })}
              </span>
            </div>

            {/* Gender + experience */}
            {profile?.gender || profile?.experience ? (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {profile.gender ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <GenderIcon gender={profile.gender} />
                    {t(GENDER_KEY[profile.gender])}
                  </span>
                ) : null}
                {profile.experience ? (
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Trophy className="size-3.5 text-amber-500" />
                    {t(EXPERIENCE_KEY[profile.experience])}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Hobbies */}
            {profile?.hobbies && profile.hobbies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.hobbies.map((hobby, i) => (
                  <Badge
                    key={`${hobby}-${i}`}
                    variant="secondary"
                    className="rounded-full font-normal"
                  >
                    {hobby}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Introduction */}
            {profile?.introduction ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {profile.introduction}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
