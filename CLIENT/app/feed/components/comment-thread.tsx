"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Spin, Typography } from "antd"
import { useTranslation } from "react-i18next"
import { usePostComments } from "@/lib/hooks/use-post-comments"
import type { CommentThreadItem } from "@/lib/types/post"
import { CommentItem } from "./comment-item"
import { CommentForm } from "./comment-form"
import styles from "./comment-thread.module.scss"

interface CommentThreadProps {
  postId: string
  enabled: boolean
  currentUserId?: string
}

interface ReplyTarget {
  threadRootId: string
  anchorCommentId: string
}

function ReplyComposerInline({
  postId,
  parentCommentId,
  onDismiss,
  nestedAlign,
}: {
  postId: string
  parentCommentId: string
  onDismiss: () => void
  nestedAlign?: boolean
}) {
  return (
    <div
      className={`${styles.replyBox}${nestedAlign ? ` ${styles.replyBoxNested}` : ""}`}
    >
      <CommentForm
        postId={postId}
        parentCommentId={parentCommentId}
        compact
        layout="inline"
        showCancel
        onCancel={onDismiss}
        onSuccess={onDismiss}
      />
    </div>
  )
}

export const CommentThread = ({
  postId,
  enabled,
  currentUserId,
}: CommentThreadProps) => {
  const { t } = useTranslation()
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = usePostComments(postId, enabled)

  const threads: CommentThreadItem[] = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  )

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: "80px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage, threads.length])

  if (!enabled) return null

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    )
  }

  if (isError) {
    return (
      <Typography.Text type="danger">{t("feed.comments.loadError")}</Typography.Text>
    )
  }

  return (
    <div className={styles.root}>
      {threads.map((thread) => (
        <div key={thread.id} className={styles.thread}>
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
            <ReplyComposerInline
              postId={postId}
              parentCommentId={replyTarget.threadRootId}
              onDismiss={() => setReplyTarget(null)}
            />
          ) : null}
          {thread.replies.map((reply) => (
            <Fragment key={reply.id}>
              <CommentItem
                comment={reply}
                postId={postId}
                threadRootId={thread.id}
                currentUserId={currentUserId}
                isNested
                onReply={(threadRootId, anchorCommentId) =>
                  setReplyTarget({ threadRootId, anchorCommentId })
                }
              />
              {replyTarget?.threadRootId === thread.id &&
              replyTarget.anchorCommentId === reply.id ? (
                <ReplyComposerInline
                  postId={postId}
                  parentCommentId={replyTarget.threadRootId}
                  onDismiss={() => setReplyTarget(null)}
                  nestedAlign
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      ))}

      <CommentForm postId={postId} parentCommentId={null} />

      <div ref={loadMoreRef} style={{ height: 1 }} aria-hidden />

      {isFetchingNextPage ? (
        <div className={styles.loading}>
          <Spin size="small" />
        </div>
      ) : null}
    </div>
  )
}
