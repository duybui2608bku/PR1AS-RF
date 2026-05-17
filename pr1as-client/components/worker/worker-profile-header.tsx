"use client"

import { AlertTriangle, Heart, Loader2, Mars, Pencil, ShieldCheck, Star, Trophy, User as UserIcon, Venus, VenusAndMars } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getPlanRingClass } from "@/lib/utils/plan"
import { getReputationBadgeClass, getReputationScore } from "@/lib/utils/reputation"
import type { WorkerDetail, WorkerExperience, WorkerGender } from "@/types"

const EXPERIENCE_LABEL: Record<WorkerExperience, string> = {
  LESS_THAN_1: "Dưới 1 năm",
  ONE_TO_3: "1-3 năm",
  THREE_TO_5: "3-5 năm",
  FIVE_TO_10: "5-10 năm",
  MORE_THAN_10: "Trên 10 năm",
}

const GENDER_LABEL: Record<WorkerGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
}

const GenderIcon = ({ gender }: { gender?: WorkerGender }) => {
  if (gender === "MALE") return <Mars className="size-3.5 text-blue-500" />
  if (gender === "FEMALE") return <Venus className="size-3.5 text-pink-500" />
  return <VenusAndMars className="size-3.5 text-muted-foreground" />
}

const HOBBY_COLORS = [
  "bg-emerald-500 text-white",
  "bg-amber-600 text-white",
  "bg-orange-500 text-white",
  "bg-violet-500 text-white",
  "bg-rose-500 text-white",
  "bg-cyan-500 text-white",
]

type Props = {
  worker: WorkerDetail
  isOwnProfile?: boolean
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: () => void
}

export function WorkerProfileHeader({
  worker,
  isOwnProfile = false,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
}: Props) {
  const router = useRouter()
  const profile = worker.worker_profile
  const stats = worker.review_stats
  const ratingAverage = stats?.average ?? 0
  const ratingCount = stats?.total ?? 0

  const gallery: string[] = []
  if (worker.user.avatar) gallery.push(worker.user.avatar)
  if (profile?.gallery_urls) {
    for (const url of profile.gallery_urls) {
      if (!gallery.includes(url)) gallery.push(url)
    }
  }

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = gallery[activeIndex] ?? gallery[0] ?? null

  const fullName = worker.user.full_name ?? "Chưa cập nhật"
  const title = profile?.title ?? null
  const initials = (fullName || "?").trim().charAt(0).toUpperCase()
  const reputationScore = getReputationScore(worker.user.meta_data?.reputation_score)
  const isLowReputation = reputationScore < 30

  return (
    <div className="space-y-4">
    {isLowReputation ? (
      <Alert className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
        <AlertTriangle className="size-4 text-red-500" />
        <AlertDescription className="font-medium">
          Worker này có điểm uy tín thấp ({reputationScore}/100). Dịch vụ đặt lịch tạm thời bị hạn chế.
        </AlertDescription>
      </Alert>
    ) : null}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,600px)_1fr]">
      <div className="space-y-3">
        <AspectRatio
          ratio={5 / 4}
          className="overflow-hidden rounded-2xl bg-muted"
        >
          {activeImage ? (
            <Image
              src={activeImage}
              alt={fullName}
              fill
              sizes="(min-width: 768px) 360px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Chưa có ảnh
            </div>
          )}
        </AspectRatio>

        {gallery.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                aria-label={`Ảnh ${index + 1}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <Avatar size="lg" className={cn("size-12 shrink-0", getPlanRingClass(worker.user.meta_data?.pricing_plan_code))}>
            {worker.user.avatar ? (
              <AvatarImage src={worker.user.avatar} alt={fullName} />
            ) : null}
            <AvatarFallback>
              {initials || <UserIcon className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                <span>{fullName}</span>
                {title ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    - {title}
                  </span>
                ) : null}
              </h1>
              {isOwnProfile ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => router.push("/worker/setup")}
                >
                  <Pencil className="size-3.5" />
                </Button>
              ) : onToggleFavorite ? (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  disabled={isFavoritePending}
                  aria-label={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                  title={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
                    isFavorite
                      ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60"
                      : "border-border bg-background text-muted-foreground hover:border-rose-300 hover:text-rose-500"
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
                          : "text-current"
                      )}
                    />
                  )}
                  <span>{isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  i < Math.round(ratingAverage)
                    ? "size-4 fill-amber-400 text-amber-400"
                    : "size-4 text-muted-foreground/40"
                }
              />
            ))}
          </div>
          <span>({ratingCount} đánh giá)</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", getReputationBadgeClass(reputationScore))}>
            <ShieldCheck className="size-3.5" />
            Điểm uy tín {reputationScore}/100
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {profile?.gender ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <GenderIcon gender={profile.gender} />
              {GENDER_LABEL[profile.gender]}
            </span>
          ) : null}
          {profile?.experience ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Trophy className="size-3.5 text-amber-500" />
              {EXPERIENCE_LABEL[profile.experience]}
            </span>
          ) : null}
        </div>

        {profile?.hobbies && profile.hobbies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.hobbies.map((hobby, i) => (
              <Badge
                key={`${hobby}-${i}`}
                className={cn(
                  HOBBY_COLORS[i % HOBBY_COLORS.length],
                  "border-0",
                )}
              >
                {hobby}
              </Badge>
            ))}
          </div>
        ) : null}

        {profile?.introduction ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-rose-500 dark:text-rose-400">
            {profile.introduction}
          </p>
        ) : null}
      </div>
    </div>
    </div>
  )
}
