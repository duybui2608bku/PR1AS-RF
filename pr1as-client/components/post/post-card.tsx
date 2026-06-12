"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flag,
  Globe,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useOpenPostReport, useReportPost } from "@/lib/hooks/use-moderation"
import { useDeletePost, useSetCommentsLock } from "@/lib/hooks/use-posts"
import { useTogglePostRegistration } from "@/lib/hooks/use-post-registrations"
import { useAuthStore } from "@/lib/store/auth-store"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import { cn } from "@/lib/utils"
import { getPlanRingClass } from "@/lib/utils/plan"
import { formatRelativeOrDate } from "@/lib/utils/time"
import type { PostPublic } from "@/types"
import { EditPostDialog } from "./edit-post-dialog"
import { RegistrantsSheet } from "./registrants-sheet"
import { Textarea } from "@/components/ui/textarea"
import type { ReportReason } from "@/services/moderation.service"

type Props = {
  post: PostPublic
}

const reportReasonOptions: Array<{ value: ReportReason; label: string }> = [
  { value: "scam", label: "Lừa đảo" },
  { value: "low_quality", label: "Chất lượng thấp" },
  { value: "harassment", label: "Quấy rối" },
  { value: "fake_profile", label: "Hồ sơ giả mạo" },
  { value: "other", label: "Khác" },
]

function AuthorAvatar({
  avatar,
  name,
  planCode,
}: {
  avatar: string | null
  name: string | null
  planCode?: string | null
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={40}
        height={40}
        className={cn(
          "size-10 rounded-full object-cover",
          getPlanRingClass(planCode)
        )}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-muted",
        getPlanRingClass(planCode)
      )}
    >
      <User className="size-5 text-muted-foreground" />
    </div>
  )
}

function PostBodyWithHashtags({
  body,
  hashtags,
}: {
  body: string
  hashtags: PostPublic["hashtags"]
}) {
  // Map "#display" (thường hoá) → slug để link chính xác về trang lọc hashtag.
  const slugByDisplay = new Map(
    hashtags.map((h) => [`#${h.display.toLowerCase()}`, h.slug]),
  )
  const parts = body.split(/(#[\p{L}\p{N}_]{1,50})/gu)
  return (
    <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (!part.startsWith("#")) return part
        const slug = slugByDisplay.get(part.toLowerCase()) ?? part.slice(1).toLowerCase()
        return (
          <Link
            key={i}
            href={`/posts?hashtag=${encodeURIComponent(slug)}`}
            className="font-medium text-primary hover:underline"
          >
            {part}
          </Link>
        )
      })}
    </p>
  )
}

type PostMediaItem = PostPublic["media"][number]

function MediaPreview({
  item,
  className,
}: {
  item: PostMediaItem
  className?: string
}) {
  if (item.type === "video") {
    return (
      <video
        src={item.url}
        muted
        playsInline
        className={className}
      />
    )
  }

  return (
    <Image
      src={item.url}
      alt="Post image"
      fill
      sizes="(max-width: 768px) 100vw, 640px"
      className={className}
    />
  )
}

function MediaSlider({
  items,
  currentIndex,
  onClose,
  onChange,
}: {
  items: PostMediaItem[]
  currentIndex: number
  onClose: () => void
  onChange: (index: number) => void
}) {
  const t = useTranslations("PostCard")
  const item = items[currentIndex]
  const hasMultiple = items.length > 1
  const touchStartX = useRef<number | null>(null)

  const goNext = () => onChange((currentIndex + 1) % items.length)
  const goPrev = () => onChange((currentIndex - 1 + items.length) % items.length)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowLeft" && hasMultiple) {
        onChange((currentIndex - 1 + items.length) % items.length)
      }
      if (event.key === "ArrowRight" && hasMultiple) {
        onChange((currentIndex + 1) % items.length)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, hasMultiple, items.length, onChange, onClose])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/95">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {currentIndex + 1}/{items.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full bg-muted/80"
          aria-label={t("close")}
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
      </div>

      {hasMultiple ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-muted/80"
            aria-label={t("prevImage")}
            onClick={() => onChange((currentIndex - 1 + items.length) % items.length)}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-muted/80"
            aria-label={t("nextImage")}
            onClick={() => onChange((currentIndex + 1) % items.length)}
          >
            <ChevronRight className="size-6" />
          </Button>
        </>
      ) : null}

      <div
        className="flex h-full items-center justify-center p-4 sm:p-8"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null || !hasMultiple) return
          const dx = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current
          if (Math.abs(dx) > 50) {
            if (dx < 0) goNext()
            else goPrev()
          }
          touchStartX.current = null
        }}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="relative h-full max-h-[86vh] w-full">
            <Image
              src={item.url}
              alt="Post image"
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        )}
      </div>
    </div>
  )
}

function PostMedia({ media }: { media: PostPublic["media"] }) {
  const t = useTranslations("PostCard")
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  if (media.length === 0) return null

  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order)
  const visibleItems = sorted.length >= 4 ? sorted.slice(0, 4) : sorted
  const hiddenCount = sorted.length - visibleItems.length

  if (sorted.length === 1) {
    const item = sorted[0]
    return (
      <div>
        {item.type === "video" ? (
          <div className="overflow-hidden rounded-lg border bg-muted">
            <video src={item.url} controls className="max-h-[32rem] w-full object-contain" />
          </div>
        ) : (
          <button
            type="button"
            className="relative block max-h-[32rem] w-full overflow-hidden rounded-lg border bg-muted"
            onClick={() => setViewerIndex(0)}
            aria-label={t("viewImage")}
          >
            <Image
              src={item.url}
              alt="Post image"
              width={900}
              height={700}
              sizes="(max-width: 768px) 100vw, 640px"
              className="max-h-[32rem] w-full object-contain"
            />
          </button>
        )}
        {viewerIndex !== null
          ? createPortal(
              <MediaSlider
                items={sorted}
                currentIndex={viewerIndex}
                onChange={setViewerIndex}
                onClose={() => setViewerIndex(null)}
              />,
              document.body
            )
          : null}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="group relative aspect-square overflow-hidden rounded border bg-muted"
            onClick={() => setViewerIndex(index)}
            aria-label={t("openMedia", { index: index + 1 })}
          >
            <MediaPreview item={item} className="h-full w-full object-contain" />
            {index === 3 && hiddenCount > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white transition-colors group-hover:bg-black/45">
                {t("viewMore", { count: hiddenCount })}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {viewerIndex !== null
        ? createPortal(
            <MediaSlider
              items={sorted}
              currentIndex={viewerIndex}
              onChange={setViewerIndex}
              onClose={() => setViewerIndex(null)}
            />,
            document.body
          )
        : null}
    </>
  )
}

export function PostCard({ post }: Props) {
  const t = useTranslations("PostCard")
  const { user, isAuthenticated } = useAuthStore()
  const deleteMutation = useDeletePost()
  const lockMutation = useSetCommentsLock()
  const reportMutation = useReportPost()
  const toggleRegistrationMutation = useTogglePostRegistration(post.id)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [registrantsOpen, setRegistrantsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>("scam")
  const [reportDescription, setReportDescription] = useState("")
  const [reportDescriptionError, setReportDescriptionError] = useState("")

  const { requireAuth } = useAuthRequired()

  const isOwner = user?.id === post.author.id
  const canManagePost = isOwner && !isWorkerRoleActive(user)
  const isWorkerActive = isWorkerRoleActive(user)
  const hasWorkerProfile = Boolean(user?.worker_profile)
  const openPostReportQuery = useOpenPostReport(
    post.id,
    menuOpen && isAuthenticated && !canManagePost
  )
  const hasOpenPostReport = Boolean(openPostReportQuery.data)
  const timeAgo = formatRelativeOrDate(post.created_at)
  const workerHref = post.author.has_worker_profile ? `/worker/${post.author.id}` : null

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(post.id)
      setDeleteOpen(false)
    } catch {
    }
  }

  const handleToggleCommentsLock = () => {
    if (lockMutation.isPending) return
    lockMutation.mutate({ id: post.id, locked: !post.comments_locked })
  }

  const handleReport = async () => {
    const description = reportDescription.trim()
    if (description.length < 10) {
      setReportDescriptionError("Mô tả báo cáo phải có ít nhất 10 ký tự.")
      return
    }

    await reportMutation.mutateAsync({
      post_id: post.id,
      reason: reportReason,
      description,
    })
    setReportReason("scam")
    setReportDescription("")
    setReportDescriptionError("")
    setReportOpen(false)
  }

  const handleReportDescriptionChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value
    setReportDescription(value)
    setReportDescriptionError(
      value.trim().length > 0 && value.trim().length < 10
        ? "Mô tả báo cáo phải có ít nhất 10 ký tự."
        : ""
    )
  }

  return (
    <article className="border-b bg-card p-4 sm:rounded-xl sm:border sm:shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {workerHref ? (
            <Link href={workerHref} className="shrink-0 rounded-full hover:opacity-80 transition-opacity">
              <AuthorAvatar
                avatar={post.author.avatar}
                name={post.author.full_name}
                planCode={post.author.meta_data?.pricing_plan_code}
              />
            </Link>
          ) : (
            <AuthorAvatar
              avatar={post.author.avatar}
              name={post.author.full_name}
              planCode={post.author.meta_data?.pricing_plan_code}
            />
          )}
          <div className="min-w-0">
            {workerHref ? (
              <Link href={workerHref} className="block truncate text-sm font-semibold leading-tight hover:underline">
                {post.author.full_name ?? t("defaultUser")}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold leading-tight">
                {post.author.full_name ?? t("defaultUser")}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              <span>·</span>
              {post.visibility === "public" ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
            </div>
          </div>
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 size-9 shrink-0 text-muted-foreground active:scale-90"
              aria-label={t("menuLabel")}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManagePost ? (
              <>
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />
                  {t("editPost")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={lockMutation.isPending}
                  onSelect={(event) => {
                    event.preventDefault()
                    handleToggleCommentsLock()
                  }}
                >
                  {post.comments_locked ? (
                    <>
                      <LockOpen className="size-3.5" />
                      {t("unlockComments")}
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5" />
                      {t("lockComments")}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  {t("deletePost")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                disabled={isAuthenticated && (openPostReportQuery.isFetching || hasOpenPostReport)}
                onSelect={(event) => {
                  event.preventDefault()
                  requireAuth(() => {
                    if (openPostReportQuery.isFetching || hasOpenPostReport) return
                    setReportOpen(true)
                  })
                }}
              >
                <Flag className="size-3.5" />
                {isAuthenticated && hasOpenPostReport
                  ? "Báo cáo đang được xử lý"
                  : "Báo cáo bài viết"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {canManagePost ? (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deletePostTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deletePostDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  {t("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault()
                    handleDelete()
                  }}
                >
                  {deleteMutation.isPending ? t("deleting") : t("deletePost")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      <div className="mb-3">
        <PostBodyWithHashtags body={post.body} hashtags={post.hashtags} />
      </div>

      {post.media.length > 0 ? (
        <div className="mb-3">
          <PostMedia media={post.media} />
        </div>
      ) : null}
  
      {post.hashtags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Badge key={tag.slug} asChild variant="secondary" className="text-xs">
              <Link href={`/posts?hashtag=${encodeURIComponent(tag.slug)}`}>
                #{tag.display}
              </Link>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          {/* Registration count pill */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300",
              post.registrations_count > 0
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                : "text-muted-foreground"
            )}
          >
            <Users className="size-3.5 shrink-0" />
            <span className="tabular-nums">
              {post.registrations_count > 0
                ? `${post.registrations_count} người đăng ký`
                : "Chưa có người đăng ký"}
            </span>
          </div>

          {/* Registration action button */}
          {isOwner ? (
            <button
              type="button"
              onClick={() => setRegistrantsOpen(true)}
              className="group flex items-center gap-2 rounded-xl border border-border bg-accent/50 px-3.5 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:shadow-sm active:scale-[0.97]"
            >
              <ClipboardList className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              Xem danh sách
              {post.registrations_count > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold tabular-nums text-background">
                  {post.registrations_count > 99 ? "99+" : post.registrations_count}
                </span>
              ) : null}
            </button>
          ) : isAuthenticated && isWorkerActive && hasWorkerProfile ? (
            <button
              type="button"
              disabled={toggleRegistrationMutation.isPending}
              onClick={() => toggleRegistrationMutation.mutate()}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
                post.my_registration
                  ? "border border-green-500/40 bg-green-50 text-green-700 shadow-[0_0_12px_rgba(34,197,94,0.18)] hover:shadow-[0_0_18px_rgba(34,197,94,0.28)] dark:bg-green-950/40 dark:text-green-400"
                  : "border border-sky-400/20 bg-sky-400 text-white shadow-sm hover:bg-sky-500 hover:shadow-md",
                toggleRegistrationMutation.isPending && "cursor-not-allowed opacity-60"
              )}
            >
              {post.my_registration
                ? <BadgeCheck className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                : <UserPlus className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              }
              {post.my_registration ? "Đã đăng ký" : "Đăng ký"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                toast.info(
                  !isAuthenticated
                    ? "Bạn phải đăng nhập và tạo worker profile"
                    : "Bạn phải tạo worker profile"
                )
              }}
              className="group flex items-center gap-2 rounded-xl border border-border/50 px-3.5 py-2 text-sm font-medium text-muted-foreground/70 transition-all duration-200 hover:bg-accent/50 active:scale-[0.97]"
            >
              <UserPlus className="size-5 shrink-0 opacity-40 transition-transform duration-200 group-hover:scale-105" />
              Đăng ký
            </button>
          )}
        </div>
      </div>

      {/* TODO: re-enable like and comment features
      <div className="mt-3 flex flex-col gap-2 border-t pt-2">
        <div className="flex items-center gap-1">
          {isAuthenticated ? <ReactionPicker post={post} /> : null}
          <Button ... comment button ... />
        </div>
      </div>
      <CommentsSheet ... />
      */}

      <RegistrantsSheet
        open={registrantsOpen}
        onOpenChange={setRegistrantsOpen}
        postId={post.id}
        registrationsCount={post.registrations_count}
      />

      {editOpen && canManagePost ? (
        <EditPostDialog post={post} onClose={() => setEditOpen(false)} />
      ) : null}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open)
          if (!open) setReportDescriptionError("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo bài viết</DialogTitle>
          </DialogHeader>
          <Select
            value={reportReason}
            onValueChange={(value) => setReportReason(value as ReportReason)}
            disabled={reportMutation.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn lý do báo cáo" />
            </SelectTrigger>
            <SelectContent>
              {reportReasonOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={reportDescription}
            onChange={handleReportDescriptionChange}
            placeholder="Mô tả lý do báo cáo..."
            aria-invalid={Boolean(reportDescriptionError)}
            className={`min-h-28 ${
              reportDescriptionError
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : ""
            }`}
          />
          {reportDescriptionError ? (
            <p className="text-sm text-destructive">
              {reportDescriptionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportOpen(false)}
              disabled={reportMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleReport()}
              disabled={reportMutation.isPending}
            >
              Báo cáo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
