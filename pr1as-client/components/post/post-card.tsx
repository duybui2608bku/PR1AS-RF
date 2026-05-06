"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeletePost } from "@/lib/hooks/use-posts"
import { useAuthStore } from "@/lib/store/auth-store"
import type { PostPublic } from "@/types"
import { EditPostDialog } from "./edit-post-dialog"
import { PostComments } from "./post-comments"

type Props = {
  post: PostPublic
}

function AuthorAvatar({ avatar, name }: { avatar: string | null; name: string | null }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
      <User className="size-5 text-muted-foreground" />
    </div>
  )
}

function PostBodyWithHashtags({ body }: { body: string }) {
  const parts = body.split(/(#[\p{L}\p{N}_]{1,50})/gu)
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-medium text-primary cursor-pointer hover:underline">
            {part}
          </span>
        ) : (
          part
        ),
      )}
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
  const item = items[currentIndex]
  const hasMultiple = items.length > 1

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
          aria-label="ÄÃ³ng"
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
            aria-label="áº¢nh trÆ°á»›c"
            onClick={() => onChange((currentIndex - 1 + items.length) % items.length)}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-muted/80"
            aria-label="áº¢nh sau"
            onClick={() => onChange((currentIndex + 1) % items.length)}
          >
            <ChevronRight className="size-6" />
          </Button>
        </>
      ) : null}

      <div className="flex h-full items-center justify-center p-4 sm:p-8">
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
            aria-label="Xem ảnh"
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
        {viewerIndex !== null ? (
          <MediaSlider
            items={sorted}
            currentIndex={viewerIndex}
            onChange={setViewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        ) : null}
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
            aria-label={`Má»Ÿ media ${index + 1}`}
          >
            <MediaPreview item={item} className="h-full w-full object-contain" />
            {index === 3 && hiddenCount > 0 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white transition-colors group-hover:bg-black/45">
                Xem thÃªm +{hiddenCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {viewerIndex !== null ? (
        <MediaSlider
          items={sorted}
          currentIndex={viewerIndex}
          onChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  )
}

export function PostCard({ post }: Props) {
  const { user, isAuthenticated } = useAuthStore()
  const deleteMutation = useDeletePost()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const isOwner = user?.id === post.author.id
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: vi,
  })

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(post.id)
      setDeleteOpen(false)
    } catch {
      // Error toast is handled by the mutation.
    }
  }

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <AuthorAvatar avatar={post.author.avatar} name={post.author.full_name} />
          <div>
            <p className="text-sm font-semibold leading-tight">
              {post.author.full_name ?? "Người dùng"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              <span>Â·</span>
              {post.visibility === "public" ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
            </div>
          </div>
        </div>

        {isOwner ? (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  aria-label="Menu bài viết"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Xóa bài
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bài viết sẽ bị xóa khỏi bảng tin. Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Hủy
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault()
                    handleDelete()
                  }}
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa bài"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}      </div>

      {/* Body */}
      <div className="mb-3">
        <PostBodyWithHashtags body={post.body} />
      </div>

      {/* Media */}
      {post.media.length > 0 ? (
        <div className="mb-3">
          <PostMedia media={post.media} />
        </div>
      ) : null}

      {/* Hashtags */}
      {post.hashtags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Badge key={tag.slug} variant="secondary" className="cursor-pointer text-xs">
              #{tag.display}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground"
          aria-expanded={commentsOpen}
          onClick={() => setCommentsOpen((open) => !open)}
        >
          <MessageCircle className="size-4" />
          Bình luận
        </Button>
      </div>

      <PostComments
        postId={post.id}
        enabled={commentsOpen}
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
      />

      {editOpen ? (
        <EditPostDialog post={post} onClose={() => setEditOpen(false)} />
      ) : null}
    </article>
  )
}
