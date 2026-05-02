"use client"

import { useCallback, useRef, useState } from "react"
import { Button, Input } from "antd"
import { useTranslation } from "react-i18next"
import { createCommentBodySchema } from "@/lib/types/post"
import { useCreateComment } from "@/lib/hooks/use-create-comment"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import { FEED_CONSTANTS } from "@/lib/constants/feed.constants"
import styles from "./comment-form.module.scss"

const { TextArea } = Input

interface CommentFormProps {
  postId: string
  /** null = comment top-level mới; hoặc ID comment gốc khi trả lời thread */
  parentCommentId: string | null
  compact?: boolean
  /** `inline`: một hàng textarea + nút (cho ReplyComposerInline). */
  layout?: "stacked" | "inline"
  showCancel?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}

export const CommentForm = ({
  postId,
  parentCommentId,
  compact,
  layout = "stacked",
  showCancel,
  onCancel,
  onSuccess,
}: CommentFormProps) => {
  const { t } = useTranslation()
  const { handleError } = useErrorHandler()
  const createComment = useCreateComment()
  const [body, setBody] = useState("")
  const submitLockRef = useRef(false)

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current || createComment.isPending) {
      return
    }
    const parsed = createCommentBodySchema.safeParse({
      body,
      parent_comment_id: parentCommentId,
    })
    if (!parsed.success) {
      handleError(new Error(t("feed.comments.validation")))
      return
    }
    submitLockRef.current = true
    try {
      await createComment.mutateAsync({
        postId,
        body: parsed.data.body,
        parentCommentId: parsed.data.parent_comment_id ?? null,
      })
      setBody("")
      onSuccess?.()
    } catch {
      /* mutation */
    } finally {
      submitLockRef.current = false
    }
  }, [
    body,
    createComment,
    handleError,
    onSuccess,
    parentCommentId,
    postId,
    t,
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.key !== "Enter" || e.shiftKey) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    void handleSubmit()
  }

  const placeholder =
    parentCommentId != null
      ? t("feed.comments.replyPlaceholder")
      : t("feed.comments.placeholder")

  const submitLabel =
    parentCommentId != null ? t("feed.comments.reply") : t("feed.comments.submit")

  const autoSize =
    compact ? { minRows: 1, maxRows: 4 } : { minRows: 2, maxRows: 8 }

  const primaryButtonSize = compact ? "small" : "middle"

  if (layout === "inline") {
    return (
      <div className={styles.inline}>
        <TextArea
          className={styles.inlineField}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          autoSize={autoSize}
          maxLength={FEED_CONSTANTS.COMMENT_MAX_CHARS}
          onKeyDown={handleKeyDown}
          aria-label={placeholder}
        />
        <div className={styles.inlineActions}>
          {showCancel ? (
            <Button
              type="text"
              htmlType="button"
              size={primaryButtonSize}
              disabled={createComment.isPending}
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
          <Button
            type="primary"
            htmlType="button"
            size={primaryButtonSize}
            loading={createComment.isPending}
            onClick={() => void handleSubmit()}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.stacked}${compact ? ` ${styles.stackedCompact}` : ""}`}
    >
      <TextArea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoSize={autoSize}
        maxLength={FEED_CONSTANTS.COMMENT_MAX_CHARS}
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
      />
      <Button
        type="primary"
        htmlType="button"
        size={primaryButtonSize}
        style={{ marginTop: 8 }}
        loading={createComment.isPending}
        onClick={() => void handleSubmit()}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
