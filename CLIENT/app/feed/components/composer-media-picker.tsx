"use client"

import React, { useState } from "react"
import {
  Button,
  Dropdown,
  Input,
  Space,
  Tooltip,
  Typography,
  type MenuProps,
} from "antd"
import {
  PictureOutlined,
  VideoCameraOutlined,
  DeleteOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons"
import { useTranslation } from "react-i18next"
import type { PostMediaType } from "@/lib/types/post"
import { FEED_CONSTANTS } from "@/lib/constants/feed.constants"
import styles from "./composer.module.scss"

const ACCEPT_COMPOSER_IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i

export interface ComposerMediaItem {
  url: string
  type: PostMediaType
}

interface ComposerMediaPickerProps {
  items: ComposerMediaItem[]
  onChange: (items: ComposerMediaItem[]) => void
  onUploadImages: (files: File[]) => Promise<void>
  disabled?: boolean
  /** `toolbar` = compact chips like design mockup */
  variant?: "default" | "toolbar"
}

interface ComposerMediaRowProps {
  item: ComposerMediaItem
  index: number
  onRemove: () => void
}

const ComposerMediaRow = ({ item, index, onRemove }: ComposerMediaRowProps) => {
  const { t } = useTranslation()
  const label =
    item.type === "image"
      ? t("feed.composer.imageN", { n: index + 1 })
      : t("feed.composer.videoN", { n: index + 1 })

  return (
    <li className={styles.mediaChipRow}>
      <div className={styles.mediaChipPreview}>
        {item.type === "image" ? (
          <img
            src={item.url}
            alt={label}
            className={styles.mediaThumb}
            loading="lazy"
          />
        ) : (
          <div className={styles.mediaVideoThumb} role="img" aria-label={label}>
            <VideoCameraOutlined aria-hidden />
          </div>
        )}
        {item.type === "video" ? (
          <span className={styles.mediaChipText} title={item.url}>
            {label}
          </span>
        ) : null}
      </div>
      <Button
        type="text"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={onRemove}
        aria-label={t("feed.composer.removeMedia")}
      />
    </li>
  )
}

export const ComposerMediaPicker = ({
  items,
  onChange,
  onUploadImages,
  disabled,
  variant = "default",
}: ComposerMediaPickerProps) => {
  const { t } = useTranslation()
  const [videoUrlDraft, setVideoUrlDraft] = useState("")
  const [videoPanelOpen, setVideoPanelOpen] = useState(false)

  const handleAddVideoUrl = () => {
    const trimmed = videoUrlDraft.trim()
    if (!trimmed) return
    let parsedUrl: URL
    try {
      parsedUrl = new URL(trimmed)
    } catch {
      return
    }
    if (parsedUrl.protocol !== "https:") {
      return
    }
    if (items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS) return
    onChange([...items, { url: trimmed, type: "video" }])
    setVideoUrlDraft("")
    setVideoPanelOpen(false)
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!raw.length || disabled) return
    const remaining = FEED_CONSTANTS.MEDIA_MAX_ITEMS - items.length
    if (remaining <= 0) return
    const images = raw.filter(
      (f) => !f.type || ACCEPT_COMPOSER_IMAGE_MIME.test(f.type)
    )
    const batch = images.slice(0, remaining)
    if (!batch.length) return
    await onUploadImages(batch)
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const mediaMenuItems: MenuProps["items"] = [
    {
      key: "photo",
      icon: <PictureOutlined />,
      label: t("feed.composer.addImage"),
      disabled: disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS,
    },
    {
      key: "video",
      icon: <VideoCameraOutlined />,
      label: t("feed.composer.addVideo"),
      disabled: disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS,
    },
  ]

  const onMediaMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "photo") {
      fileInputRef.current?.click()
    }
    if (key === "video") {
      setVideoPanelOpen(true)
    }
  }

  if (variant === "toolbar") {
    return (
      <div className={styles.toolbarRoot}>
        <div className={styles.mediaToolbarRow}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.fileInput}
            onChange={handleFileChange}
            disabled={disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS}
            aria-label={t("feed.composer.addImagesAria")}
          />
          <Dropdown
            menu={{ items: mediaMenuItems, onClick: onMediaMenuClick }}
            trigger={["click"]}
            disabled={disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS}
          >
            <button
              type="button"
              className={styles.mediaChip}
              disabled={
                disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS
              }
            >
              <PictureOutlined className={styles.mediaChipIcon} />
              <span>{t("feed.composer.photoVideo")}</span>
            </button>
          </Dropdown>
          <Tooltip title={t("feed.composer.comingSoon")}>
            <span className={styles.mediaChipMuted}>
              <CalendarOutlined className={styles.mediaChipIcon} />
              {t("feed.composer.appointment")}
            </span>
          </Tooltip>
          <Tooltip title={t("feed.composer.comingSoon")}>
            <span className={styles.mediaChipMuted}>
              <EnvironmentOutlined className={styles.mediaChipIcon} />
              {t("feed.composer.location")}
            </span>
          </Tooltip>
        </div>

        {videoPanelOpen ? (
          <div className={styles.videoInline}>
            <Input
              placeholder={t("feed.composer.videoUrlPlaceholder")}
              value={videoUrlDraft}
              onChange={(e) => setVideoUrlDraft(e.target.value)}
              disabled={
                disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS
              }
              onPressEnter={handleAddVideoUrl}
              aria-label={t("feed.composer.videoUrlPlaceholder")}
            />
            <Button
              type="primary"
              size="small"
              onClick={handleAddVideoUrl}
              disabled={
                disabled ||
                !videoUrlDraft.trim() ||
                items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS
              }
            >
              {t("feed.composer.addVideo")}
            </Button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className={styles.mediaList}>
            {items.map((item, index) => (
              <ComposerMediaRow
                key={`${item.url}-${index}`}
                item={item}
                index={index}
                onRemove={() => handleRemove(index)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.mediaPicker}>
      <Space wrap size="small">
        <label className={styles.uploadLabel}>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={styles.fileInput}
            onChange={handleFileChange}
            disabled={disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS}
            aria-label={t("feed.composer.addImagesAria")}
          />
          <Button
            type="default"
            icon={<PictureOutlined />}
            disabled={disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS}
          >
            {t("feed.composer.addImage")}
          </Button>
        </label>
      </Space>

      <div className={styles.videoRow}>
        <Input
          placeholder={t("feed.composer.videoUrlPlaceholder")}
          value={videoUrlDraft}
          onChange={(e) => setVideoUrlDraft(e.target.value)}
          disabled={disabled || items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS}
          onPressEnter={handleAddVideoUrl}
          aria-label={t("feed.composer.videoUrlPlaceholder")}
        />
        <Button
          type="default"
          icon={<VideoCameraOutlined />}
          onClick={handleAddVideoUrl}
          disabled={
            disabled ||
            !videoUrlDraft.trim() ||
            items.length >= FEED_CONSTANTS.MEDIA_MAX_ITEMS
          }
        >
          {t("feed.composer.addVideo")}
        </Button>
      </div>

      <Typography.Text type="secondary" className={styles.mediaHint}>
        {t("feed.composer.mediaCount", {
          current: items.length,
          max: FEED_CONSTANTS.MEDIA_MAX_ITEMS,
        })}
      </Typography.Text>

      {items.length > 0 ? (
        <ul className={styles.mediaList}>
          {items.map((item, index) => (
            <ComposerMediaRow
              key={`${item.url}-${index}`}
              item={item}
              index={index}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
