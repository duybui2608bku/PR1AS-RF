"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import {
  Check,
  Edit3,
  Loader2,
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
import { cn } from "@/lib/utils"
import type { CommentPublic, CommentThreadItem } from "@/types"

const COMMENT_MAX_LENGTH = 2000

type ReplyTarget = {
  threadRootId: string
  anchorCommentId: string
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

function CommentForm({
  postId,
  parentCommentId,
  compact,
  onCancel,
  onSuccess,
}: {
  postId: string
  parentCommentId: string | null
  compact?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}) {
  const [body, setBody] = useState("")
  const createComment = useCreateComment(postId)
  const trimmed = body.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= COMMENT_MAX_LENGTH

  const handleSubmit = async () => {
    if (!canSubmit || createComment.isPending) return

    try {
      await createComment.mutateAsync({
        body: trimmed,
        parent_comment_id: parentCommentId,
      })
      setBody("")
      onSuccess?.()
    } catch {
      // Error toast is handled by the mutation.
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
      <Textarea
        value={body}
        maxLength={COMMENT_MAX_LENGTH}
        rows={compact ? 2 : 3}
        placeholder={parentCommentId ? "Viết phản hồi..." : "Viết bình luận..."}
        className={cn("resize-none", compact ? "min-h-14 text-sm" : "min-h-20")}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleKeyDown}
      />
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
              Hủy
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
            {parentCommentId ? "Trả lời" : "Gửi"}
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
  onReply,
}: {
  comment: CommentPublic
  postId: string
  threadRootId: string
  currentUserId?: string
  nested?: boolean
  onReply: (threadRootId: string, anchorCommentId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const updateComment = useUpdateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const isAuthor = currentUserId === comment.author.id
  const displayName = comment.author.full_name?.trim() || "Người dùng"
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
      // Error toast is handled by the mutation.
    }
  }

  const handleDelete = async () => {
    if (deleteComment.isPending) return
    try {
      await deleteComment.mutateAsync(comment.id)
      setDeleteOpen(false)
    } catch {
      // Error toast is handled by the mutation.
    }
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <div className={cn("flex gap-2", nested ? "ml-8" : "")}>
        <CommentAvatar avatar={comment.author.avatar} name={displayName} nested={nested} />
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}
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
                  Hủy
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
                  Lưu
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {comment.body}
            </p>
          )}
        </div>

          {!isEditing ? (
            <div className="mt-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => onReply(threadRootId, comment.id)}
            >
              <Reply className="size-3.5" />
              Trả lời
            </Button>
            {isAuthor ? (
              <>
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
                  Sửa
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                  disabled={deleteComment.isPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {deleteComment.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Xóa
                </Button>
              </>
            ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bình luận?</AlertDialogTitle>
          <AlertDialogDescription>
            Bình luận này sẽ bị xóa khỏi bài viết. Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteComment.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={deleteComment.isPending}
            onClick={(event) => {
              event.preventDefault()
              handleDelete()
            }}
          >
            {deleteComment.isPending ? "Đang xóa..." : "Xóa bình luận"}
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

export function PostComments({
  postId,
  enabled,
  currentUserId,
  isAuthenticated,
}: {
  postId: string
  enabled: boolean
  currentUserId?: string
  isAuthenticated: boolean
}) {
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
  } = usePostComments(postId, enabled && isAuthenticated)

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
    <div className="mt-3 border-t pt-3">
      {!isAuthenticated ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <MessageCircle className="size-4" />
          Vui lòng đăng nhập để xem và bình luận.
        </div>
      ) : isLoading ? (
        <CommentsLoading />
      ) : isError ? (
        <p className="text-sm text-red-600">Không tải được bình luận.</p>
      ) : (
        <div className="space-y-4">
          {threads.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              <MessageCircle className="size-4" />
              Chưa có bình luận nào.
            </div>
          ) : (
            threads.map((thread) => (
              <div key={thread.id} className="space-y-2">
                <CommentItem
                  comment={thread}
                  postId={postId}
                  threadRootId={thread.id}
                  currentUserId={currentUserId}
                  onReply={(threadRootId, anchorCommentId) =>
                    setReplyTarget({ threadRootId, anchorCommentId })
                  }
                />
                {replyTarget?.threadRootId === thread.id &&
                replyTarget.anchorCommentId === thread.id ? (
                  <div className="ml-10">
                    <CommentForm
                      postId={postId}
                      parentCommentId={replyTarget.threadRootId}
                      compact
                      onCancel={() => setReplyTarget(null)}
                      onSuccess={() => setReplyTarget(null)}
                    />
                  </div>
                ) : null}
                {thread.replies.map((reply) => (
                  <Fragment key={reply.id}>
                    <CommentItem
                      comment={reply}
                      postId={postId}
                      threadRootId={thread.id}
                      currentUserId={currentUserId}
                      nested
                      onReply={(threadRootId, anchorCommentId) =>
                        setReplyTarget({ threadRootId, anchorCommentId })
                      }
                    />
                    {replyTarget?.threadRootId === thread.id &&
                    replyTarget.anchorCommentId === reply.id ? (
                      <div className="ml-16">
                        <CommentForm
                          postId={postId}
                          parentCommentId={replyTarget.threadRootId}
                          compact
                          onCancel={() => setReplyTarget(null)}
                          onSuccess={() => setReplyTarget(null)}
                        />
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            ))
          )}

          <div ref={loadMoreRef} className="h-px" aria-hidden />
          {isFetchingNextPage ? (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          <CommentForm postId={postId} parentCommentId={null} />
        </div>
      )}
    </div>
  )
}
