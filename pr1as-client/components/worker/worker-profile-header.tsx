"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Mars, Pencil, Star, Trophy, User as UserIcon, Venus, VenusAndMars } from "lucide-react"

import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
}

export function WorkerProfileHeader({ worker, isOwnProfile = false }: Props) {
  const router = useRouter()
  const profile = worker.worker_profile
  const stats = worker.review_stats
  const ratingAverage = stats?.average ?? 0
  const ratingCount = stats?.total ?? 0

  const gallery = useMemo(() => {
    const list: string[] = []
    if (worker.user.avatar) list.push(worker.user.avatar)
    if (profile?.gallery_urls) {
      for (const url of profile.gallery_urls) {
        if (!list.includes(url)) list.push(url)
      }
    }
    return list
  }, [worker.user.avatar, profile])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = gallery[activeIndex] ?? gallery[0] ?? null

  const fullName = worker.user.full_name ?? "Chưa cập nhật"
  const title = profile?.title ?? null
  const initials = (fullName || "?").trim().charAt(0).toUpperCase()

  return (
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
          <Avatar size="lg" className="size-12 shrink-0">
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
                  Cập nhật hồ sơ
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
          <p className="text-sm leading-relaxed whitespace-pre-line text-rose-500">
            {profile.introduction}
          </p>
        ) : null}
      </div>
    </div>
  )
}
