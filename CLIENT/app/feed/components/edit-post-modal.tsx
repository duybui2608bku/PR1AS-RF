"use client"

import { useCallback, useState } from "react"
import { Modal, Input, Button, Typography } from "antd"
import { useTranslation } from "react-i18next"
import type { Post } from "@/lib/types/post"
import { updatePostBodySchema } from "@/lib/types/post"
import { useUpdatePost } from "@/lib/hooks/use-update-post"
import { uploadImage } from "@/lib/utils/upload"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import { FEED_CONSTANTS } from "@/lib/constants/feed.constants"
import {
  ComposerMediaPicker,
  type ComposerMediaItem,
} from "./composer-media-picker"
import styles from "./composer.module.scss"

const { TextArea } = Input

interface EditPostModalProps {
  open: boolean
  post: Post | null
  onClose: () => void
}

const mapMediaToComposer = (post: Post): ComposerMediaItem[] =>
  [...post.media]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ url: m.url, type: m.type }))

interface EditPostFormInnerProps {
  post: Post
  onClose: () => void
}

const EditPostFormInner = ({ post, onClose }: EditPostFormInnerProps) => {
  const { t } = useTranslation()
  const { handleError } = useErrorHandler()
  const updatePost = useUpdatePost()
  const [body, setBody] = useState(post.body)
  const [mediaItems, setMediaItems] = useState<ComposerMediaItem[]>(() =>
    mapMediaToComposer(post)
  )

  const handleUploadImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      try {
        const urls: string[] = []
        for (const file of files) {
          urls.push(await uploadImage(file))
        }
        setMediaItems((prev) => {
          const room = FEED_CONSTANTS.MEDIA_MAX_ITEMS - prev.length
          if (room <= 0) return prev
          const additions = urls.slice(0, room).map((url) => ({
            url,
            type: "image" as const,
          }))
          return [...prev, ...additions]
        })
      } catch (e) {
        handleError(e)
      }
    },
    [handleError]
  )

  const handleOk = useCallback(async () => {
    const parsed = updatePostBodySchema.safeParse({
      body,
      media: mediaItems.map((m, i) => ({
        type: m.type,
        url: m.url,
        sort_order: i,
      })),
    })
    if (!parsed.success) {
      handleError(new Error(t("feed.composer.validationError")))
      return
    }
    try {
      await updatePost.mutateAsync({
        id: post.id,
        input: parsed.data,
      })
      onClose()
    } catch {
      /* mutation handles toast */
    }
  }, [body, handleError, mediaItems, onClose, post.id, t, updatePost])

  const remaining = FEED_CONSTANTS.BODY_MAX_CHARS - body.length

  return (
    <>
      <TextArea
        className={styles.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoSize={{ minRows: 4, maxRows: 16 }}
        maxLength={FEED_CONSTANTS.BODY_MAX_CHARS}
        aria-label={t("feed.post.editTitle")}
      />
      <ComposerMediaPicker
        items={mediaItems}
        onChange={setMediaItems}
        onUploadImages={handleUploadImages}
        disabled={updatePost.isPending}
      />
      <Typography.Text type={remaining < 0 ? "danger" : "secondary"}>
        {t("feed.composer.charRemaining", { count: remaining })}
      </Typography.Text>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button key="cancel" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          key="save"
          type="primary"
          loading={updatePost.isPending}
          onClick={() => void handleOk()}
        >
          {t("common.save")}
        </Button>
      </div>
    </>
  )
}

export const EditPostModal = ({ open, post, onClose }: EditPostModalProps) => {
  const { t } = useTranslation()

  return (
    <Modal
      title={t("feed.post.editTitle")}
      open={open && Boolean(post)}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={560}
    >
      {post ? <EditPostFormInner key={post.id} post={post} onClose={onClose} /> : null}
    </Modal>
  )
}
