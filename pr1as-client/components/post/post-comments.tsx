"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  Lock,
  MessageCircle,
  Reply,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
  useCreateComment,
  useDeleteComment,
  usePostComments,
  useUpdateComment,
} from "@/lib/hooks/use-comments"
import { useAuthDialogStore } from "@/lib/store/auth-dialog-store"
import { cn } from "@/lib/utils"
import { formatRelativeOrDate } from "@/lib/utils/time"
import type { CommentPublic, CommentThreadItem } from "@/types"

const COMMENT_MAX_LENGTH = 2000
const COMMENT_COLLAPSE_LENGTH = 420
const REPLIES_PREVIEW_LIMIT = 3

const BODY_TOKEN_RE = /(@\[[^\]]+\]\([^)]+\)|#[\p{L}\p{N}_]{1,50})/gu

type ReplyTarget = {
  threadRootId: string
  anchorCommentId: string
  author: {
    id: string
    name: string | null
    hasWorkerProfile: boolean
  }
}

function CommentAvatar({
  avatar,
  name,
  nested,
}: {
  avatar: string | null
  name: string | null
  nested?: boolean
}) {
  const sizeClass = nested ? "size-7" : "size-8"

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={nested ? 28 : 32}
        height={nested ? 28 : 32}
        className={cn(sizeClass, "rounded-full object-cover")}
      />
    )
  }

  return (
    <div className={cn(sizeClass, "flex items-center justify-center rounded-full bg-muted")}>
      <User className={nested ? "size-3.5 text-muted-foreground" : "size-4 text-muted-foreground"} />
    </div>
  )
}

function CommentBodyRenderer({
  body,
  collapsed = false,
}: {
  body: string
  collapsed?: boolean
}) {
  const parts = body.split(BODY_TOKEN_RE)
  return (
    <p
      className={cn(
        "mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed",
        collapsed ? "max-h-24 overflow-hidden" : "",
      )}
    >
      {parts.map((part, i) => {
        const mentionMatch = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
        if (mentionMatch) {
          const [, name, userId] = mentionMatch
          return (
            <Link
              key={i}
              href={`/worker/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              @{name}
            </Link>
          )
        }
        if (part.startsWith("#")) {
          // Best-effort: comment không kèm slug nên dùng phần text thường hoá.
          const slug = part.slice(1).toLowerCase()
          return (
            <Link
              key={i}
              href={`/posts?hashtag=${encodeURIComponent(slug)}`}
              className="font-medium text-primary hover:underline"
            >
              {part}
            </Link>
          )
        }
        return part
      })}
    </p>
  )
}

function CommentForm({
  postId,
  parentCommentId,
  replyAuthor,
  compact,
  onCancel,
  onSuccess,
}: {
  postId: string
  parentCommentId: string | null
  replyAuthor?: { id: string; name: string | null; hasWorkerProfile: boolean }
  compact?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}) {
  const t = useTranslations("PostComments")
  const displayName = replyAuthor?.name?.trim() || t("defaultUser")
  const [body, setBody] = useState("")
  const createComment = useCreateComment(postId)
  const trimmed = body.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= COMMENT_MAX_LENGTH

  const handleSubmit = async () => {
    if (!canSubmit || createComment.isPending) return

    const finalBody = replyAuthor?.hasWorkerProfile
      ? `@[${displayName}](${replyAuthor.id}) ${trimmed}`
      : trimmed

    try {
      await createComment.mutateAsync({
        body: finalBody,
        parent_comment_id: parentCommentId,
      })
      setBody("")
      onSuccess?.()
    } catch {
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.key !== "Enter" || event.shiftKey) {
      return
    }
    event.preventDefault()
    handleSubmit()
  }

  return (
    <div className={cn("space-y-2", compact ? "rounded-lg bg-muted/40 p-2" : "")}>
      {replyAuthor ? (
        <div
          className={cn(
            "flex flex-wrap items-start gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm",
            "focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
            compact ? "min-h-14" : "min-h-20",
          )}
        >
          {replyAuthor.hasWorkerProfile ? (
            <Link
              href={`/worker/${replyAuthor.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex shrink-0 cursor-pointer items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              @{displayName}
            </Link>
          ) : (
            <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              @{displayName}
            </span>
          )}
          <textarea
            value={body}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder={t("replyPlaceholder")}
            className={cn(
              "min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground",
              compact ? "min-h-8" : "min-h-14",
            )}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : (
        <Textarea
          value={body}
          maxLength={COMMENT_MAX_LENGTH}
          rows={compact ? 2 : 3}
          placeholder={t("commentPlaceholder")}
          className={cn("resize-none", compact ? "min-h-14 text-sm" : "min-h-20")}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {trimmed.length}/{COMMENT_MAX_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={createComment.isPending}
              onClick={onCancel}
            >
              {t("cancel")}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || createComment.isPending}
            onClick={handleSubmit}
          >
            {createComment.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {parentCommentId ? t("replyButton") : t("sendButton")}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  postId,
  threadRootId,
  currentUserId,
  nested,
  canReply = true,
  isPostOwner = false,
  onReply,
}: {
  comment: CommentPublic
  postId: string
  threadRootId: string
  currentUserId?: string
  nested?: boolean
  canReply?: boolean
  isPostOwner?: boolean
  onReply: (threadRootId: string, anchorCommentId: string, author: { id: string; name: string | null; hasWorkerProfile: boolean }) => void
}) {
  const t = useTranslations("PostComments")
  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const updateComment = useUpdateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const isAuthor = currentUserId === comment.author.id
  const canDelete = isAuthor || isPostOwner
  const canCollapse = !nested && comment.body.length > COMMENT_COLLAPSE_LENGTH
  const isBodyCollapsed = canCollapse && !isExpanded
  const displayName = comment.author.full_name?.trim() || t("defaultUser")
  const workerHref = comment.author.has_worker_profile ? `/worker/${comment.author.id}` : null
  const trimmedDraft = draft.trim()
  const canSave =
    trimmedDraft.length > 0 &&
    trimmedDraft.length <= COMMENT_MAX_LENGTH &&
    trimmedDraft !== comment.body

  const handleSave = async () => {
    if (!canSave || updateComment.isPending) return

    try {
      await updateComment.mutateAsync({
        commentId: comment.id,
        body: trimmedDraft,
      })
      setIsEditing(false)
    } catch {

    }
  }

  const handleDelete = async () => {
    if (deleteComment.isPending) return
    try {
      await deleteComment.mutateAsync(comment.id)
      setDeleteOpen(false)
    } catch { 
    }
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <div className={cn("flex gap-2", nested ? "ml-8" : "")}>
        {workerHref ? (
          <Link href={workerHref} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full hover:opacity-80 transition-opacity">
            <CommentAvatar avatar={comment.author.avatar} name={displayName} nested={nested} />
          </Link>
        ) : (
          <CommentAvatar avatar={comment.author.avatar} name={displayName} nested={nested} />
        )}
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {workerHref ? (
              <Link href={workerHref} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline">
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold">{displayName}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatRelativeOrDate(comment.created_at)}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                maxLength={COMMENT_MAX_LENGTH}
                rows={3}
                className="min-h-20 resize-none text-sm"
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={updateComment.isPending}
                  onClick={() => {
                    setDraft(comment.body)
                    setIsEditing(false)
                  }}
                >
                  <X className="size-4" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canSave || updateComment.isPending}
                  onClick={handleSave}
                >
                  {updateComment.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <CommentBodyRenderer body={comment.body} collapsed={isBodyCollapsed} />
              {isBodyCollapsed ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted/50 to-transparent" />
              ) : null}
            </div>
          )}
          {!isEditing && canCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-0 text-xs font-medium text-primary hover:bg-transparent hover:text-primary/80"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              {isExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {isExpanded ? t("collapseComment") : t("expandComment")}
            </Button>
          ) : null}
        </div>

          {!isEditing ? (
            <div className="mt-1 flex items-center gap-1">
            {canReply ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => onReply(threadRootId, comment.id, {
                  id: comment.author.id,
                  name: comment.author.full_name,
                  hasWorkerProfile: comment.author.has_worker_profile,
                })}
              >
                <Reply className="size-3.5" />
                {t("replyButton")}
              </Button>
            ) : null}
            {isAuthor ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setDraft(comment.body)
                  setIsEditing(true)
                }}
              >
                <Edit3 className="size-3.5" />
                {t("editButton")}
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                disabled={deleteComment.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {deleteComment.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                {t("deleteButton")}
              </Button>
            ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteCommentTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteCommentDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteComment.isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={deleteComment.isPending}
            onClick={(event) => {
              event.preventDefault()
              handleDelete()
            }}
          >
            {deleteComment.isPending ? t("deleting") : t("deleteComment")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CommentsLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex gap-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentThread({
  thread,
  postId,
  currentUserId,
  canPostComment,
  isPostOwner,
  replyTarget,
  onReply,
  onClearReplyTarget,
}: {
  thread: CommentThreadItem
  postId: string
  currentUserId?: string
  canPostComment: boolean
  isPostOwner: boolean
  replyTarget: ReplyTarget | null
  onReply: (target: ReplyTarget) => void
  onClearReplyTarget: () => void
}) {
  const t = useTranslations("PostComments")
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const shouldExposeReplyTarget =
    replyTarget?.threadRootId === thread.id && replyTarget.anchorCommentId !== thread.id
  const shouldShowAllReplies = repliesExpanded || shouldExposeReplyTarget
  const hasHiddenReplies = thread.replies.length > REPLIES_PREVIEW_LIMIT
  const visibleReplies = shouldShowAllReplies
    ? thread.replies
    : thread.replies.slice(0, REPLIES_PREVIEW_LIMIT)
  const hiddenRepliesCount = thread.replies.length - visibleReplies.length

  return (
    <div className="space-y-2">
      <CommentItem
        comment={thread}
        postId={postId}
        threadRootId={thread.id}
        currentUserId={currentUserId}
        canReply={canPostComment}
        isPostOwner={isPostOwner}
        onReply={(threadRootId, anchorCommentId, author) =>
          onReply({ threadRootId, anchorCommentId, author })
        }
      />
      {canPostComment &&
      replyTarget?.threadRootId === thread.id &&
      replyTarget.anchorCommentId === thread.id ? (
        <div className="ml-10">
          <CommentForm
            postId={postId}
            parentCommentId={replyTarget.threadRootId}
            replyAuthor={replyTarget.author}
            compact
            onCancel={onClearReplyTarget}
            onSuccess={onClearReplyTarget}
          />
        </div>
      ) : null}
      {visibleReplies.map((reply) => (
        <Fragment key={reply.id}>
          <CommentItem
            comment={reply}
            postId={postId}
            threadRootId={thread.id}
            currentUserId={currentUserId}
            nested
            canReply={canPostComment}
            isPostOwner={isPostOwner}
            onReply={(threadRootId, anchorCommentId, author) =>
              onReply({ threadRootId, anchorCommentId, author })
            }
          />
          {canPostComment &&
          replyTarget?.threadRootId === thread.id &&
          replyTarget.anchorCommentId === reply.id ? (
            <div className="ml-16">
              <CommentForm
                postId={postId}
                parentCommentId={replyTarget.threadRootId}
                replyAuthor={replyTarget.author}
                compact
                onCancel={onClearReplyTarget}
                onSuccess={onClearReplyTarget}
              />
            </div>
          ) : null}
        </Fragment>
      ))}
      {hasHiddenReplies ? (
        <div className="ml-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
            aria-expanded={shouldShowAllReplies}
            onClick={() => setRepliesExpanded((expanded) => !expanded)}
          >
            {shouldShowAllReplies ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {shouldShowAllReplies
              ? t("collapseComment")
              : `${t("expandComment")} ${hiddenRepliesCount} ${t("replyButton").toLowerCase()}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function PostComments({
  postId,
  enabled,
  currentUserId,
  isAuthenticated,
  commentsLocked = false,
  canBypassLock = false,
  isPostOwner = false,
}: {
  postId: string
  enabled: boolean
  currentUserId?: string
  isAuthenticated: boolean
  commentsLocked?: boolean
  canBypassLock?: boolean
  isPostOwner?: boolean
}) {
  const t = useTranslations("PostComments")
  const pathname = usePathname()
  const openAuthDialog = useAuthDialogStore((state) => state.openAuthDialog)
  const canPostComment = isAuthenticated && (!commentsLocked || canBypassLock)
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
  } = usePostComments(postId, enabled)

  const threads: CommentThreadItem[] = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  )

  useEffect(() => {
    if (!enabled) return
    const node = loadMoreRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "120px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage])

  if (!enabled) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {commentsLocked ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Lock className="size-4" />
          {canBypassLock ? t("lockedByOwner") : t("lockedByAuthor")}
        </div>
      ) : null}

      {/* Danh sách bình luận — vùng cuộn */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <CommentsLoading />
        ) : isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{t("loadError")}</p>
        ) : (
          <div className="space-y-4">
            {threads.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                <MessageCircle className="size-4" />
                {t("empty")}
              </div>
            ) : (
              threads.map((thread) => (
                <CommentThread
                  key={thread.id}
                  thread={thread}
                  postId={postId}
                  currentUserId={currentUserId}
                  canPostComment={canPostComment}
                  isPostOwner={isPostOwner}
                  replyTarget={replyTarget}
                  onReply={setReplyTarget}
                  onClearReplyTarget={() => setReplyTarget(null)}
                />
              ))
            )}

            <div ref={loadMoreRef} className="h-px" aria-hidden />
            {isFetchingNextPage ? (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Composer — ghim đáy sheet */}
      {canPostComment ? (
        <div className="border-t p-3 pb-safe">
          <CommentForm postId={postId} parentCommentId={null} />
        </div>
      ) : !isAuthenticated ? (
        <div className="border-t p-3 pb-safe">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
            onClick={() => openAuthDialog(pathname)}
          >
            <MessageCircle className="size-4" />
            {t("loginRequired")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
