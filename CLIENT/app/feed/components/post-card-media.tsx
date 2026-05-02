"use client"

import { Image } from "antd"
import { useTranslation } from "react-i18next"
import type { PostMedia } from "@/lib/types/post"
import styles from "./post-card-media.module.scss"

interface PostCardMediaProps {
  media: PostMedia[]
}

const partitionMedia = (items: PostMedia[]) => {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const images = sorted.filter((m) => m.type === "image")
  const videos = sorted.filter((m) => m.type === "video")
  return { images, videos }
}

export const PostCardMedia = ({ media }: PostCardMediaProps) => {
  const { t } = useTranslation()
  const { images, videos } = partitionMedia(media)

  if (images.length === 0 && videos.length === 0) return null

  const imageCount = images.length
  const gridClass =
    imageCount <= 1
      ? styles.grid1
      : imageCount === 2
        ? styles.grid2
        : imageCount === 3
          ? styles.grid3
          : styles.grid4

  const head = imageCount > 4 ? images.slice(0, 4) : images
  const tail = imageCount > 4 ? images.slice(4) : []
  const overflow = tail.length

  return (
    <div className={styles.wrap}>
      {videos.length > 0 ? (
        <div className={styles.videoStack}>
          {videos.map((item, index) => (
            <video
              key={`${item.id}-${index}`}
              className={styles.video}
              controls
              preload="metadata"
              src={item.url}
              aria-label={t("feed.post.videoLabel")}
            />
          ))}
        </div>
      ) : null}

      {imageCount > 0 ? (
        <Image.PreviewGroup>
          <div className={`${styles.grid} ${gridClass}`}>
            {head.map((item, index) => {
              const showMoreBadge =
                overflow > 0 && index === head.length - 1
              return (
                <div
                  key={`${item.id}-${index}-${item.url}`}
                  className={styles.cell}
                >
                  <Image
                    src={item.url}
                    alt={t("feed.post.gridPhotoAlt", { n: index + 1 })}
                    className={styles.gridImage}
                    rootClassName={styles.gridImageRoot}
                    preview={{ mask: false }}
                  />
                  {showMoreBadge ? (
                    <span className={styles.moreBadge} aria-hidden>
                      {t("feed.post.gridMorePhotos", { count: overflow })}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {tail.map((item, index) => (
            <div
              key={`tail-${item.id}-${index}`}
              className={styles.previewAnchor}
              aria-hidden
            >
              <Image
                src={item.url}
                alt={t("feed.post.gridPhotoAlt", { n: head.length + index + 1 })}
                rootClassName={styles.trailingImageRoot}
                preview={{ mask: false }}
              />
            </div>
          ))}
        </Image.PreviewGroup>
      ) : null}
    </div>
  )
}
