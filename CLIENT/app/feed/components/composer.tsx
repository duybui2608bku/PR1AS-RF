"use client"

import { useCallback, useState } from "react"
import { Avatar, Button, Card, Input } from "antd"
import { UserOutlined } from "@ant-design/icons"
import { useTranslation } from "react-i18next"
import { createPostBodySchema } from "@/lib/types/post"
import { useCreatePost } from "@/lib/hooks/use-create-post"
import { uploadImage } from "@/lib/utils/upload"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import { useAuthStore } from "@/lib/stores/auth.store"
import { FEED_CONSTANTS } from "@/lib/constants/feed.constants"
import {
  ComposerMediaPicker,
  type ComposerMediaItem,
} from "./composer-media-picker"
import styles from "./composer.module.scss"

const { TextArea } = Input

export const Composer = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { handleError } = useErrorHandler()
  const createPost = useCreatePost()
  const [body, setBody] = useState("")
  const [mediaItems, setMediaItems] = useState<ComposerMediaItem[]>([])

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

  const handleSubmit = useCallback(async () => {
    const parsed = createPostBodySchema.safeParse({
      body,
      media: mediaItems.map((m, i) => ({
        type: m.type,
        url: m.url,
        sort_order: i,
      })),
      visibility: "public" as const,
    })

    if (!parsed.success) {
      handleError(
        new Error(
          parsed.error.issues[0]?.message === "required"
            ? t("feed.composer.bodyRequired")
            : t("feed.composer.validationError")
        )
      )
      return
    }

    try {
      await createPost.mutateAsync(parsed.data)
      setBody("")
      setMediaItems([])
    } catch {
      /* handled by mutation */
    }
  }, [body, createPost, handleError, mediaItems, t])

  return (
    <Card className={styles.composer} bordered={false}>
      <div className={styles.composerTop}>
        <Avatar
          size={44}
          src={user?.avatar ?? undefined}
          icon={<UserOutlined />}
          className={styles.composerAvatar}
        />
        <div className={styles.composerField}>
          <div className={styles.inputShell}>
            <TextArea
              className={styles.textarea}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("feed.composer.placeholder")}
              autoSize={{ minRows: 1, maxRows: 12 }}
              maxLength={FEED_CONSTANTS.BODY_MAX_CHARS}
              aria-label={t("feed.composer.placeholder")}
              variant="borderless"
            />
          </div>
        </div>
      </div>

      <div className={styles.composerBottomBar}>
        <div className={styles.composerBottomSpacer} aria-hidden />
        <div className={styles.composerToolbarMount}>
          <ComposerMediaPicker
            variant="toolbar"
            items={mediaItems}
            onChange={setMediaItems}
            onUploadImages={handleUploadImages}
            disabled={createPost.isPending}
          />
        </div>
        <Button
          type="primary"
          loading={createPost.isPending}
          onClick={handleSubmit}
          className={styles.submitBtn}
          aria-label={t("feed.composer.submit")}
        >
          {t("feed.composer.submit")}
        </Button>
      </div>
    </Card>
  )
}
