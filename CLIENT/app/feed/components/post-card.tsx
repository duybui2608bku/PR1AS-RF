"use client"

import { useEffect, useState } from "react"
import { Avatar, Button, Card, Space, Typography } from "antd"
import { UserOutlined, CommentOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import updateLocale from "dayjs/plugin/updateLocale"
import "dayjs/locale/vi"
import "dayjs/locale/en"
import "dayjs/locale/ko"
import "dayjs/locale/zh-cn"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import type { Post } from "@/lib/types/post"
import { useDeletePost } from "@/lib/hooks/use-delete-post"
import { getAuthorWorkerHref } from "@/app/feed/utils/author-link"
import { PostCardBody } from "./post-card-body"
import { PostCardMedia } from "./post-card-media"
import { PostCardActions } from "./post-card-actions"
import { CommentThread } from "./comment-thread"
import { EditPostModal } from "./edit-post-modal"
import styles from "./post-card.module.scss"

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)

dayjs.updateLocale("vi", {
  relativeTime: {
    future: "trong %s",
    past: "%s trước",
    s: "Vừa xong",
    m: "1 phút",
    mm: "%d phút",
    h: "1 giờ",
    hh: "%d giờ",
    d: "1 ngày",
    dd: "%d ngày",
    M: "1 tháng",
    MM: "%d tháng",
    y: "1 năm",
    yy: "%d năm",
  },
})

const dayjsLocaleFromI18n = (lang: string | undefined) => {
  const base = (lang ?? "vi").split("-")[0]?.toLowerCase() || "vi"
  if (base === "zh") return "zh-cn"
  return base
}

interface PostCardProps {
  post: Post
  currentUserId?: string
  hashtagBasePath?: string
}

export const PostCard = ({
  post,
  currentUserId,
  hashtagBasePath,
}: PostCardProps) => {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    dayjs.locale(dayjsLocaleFromI18n(i18n.language))
  }, [i18n.language])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const deletePost = useDeletePost()

  const isAuthor = currentUserId === post.author.id
  const authorName =
    post.author.full_name?.trim() || t("feed.post.anonymousAuthor")
  const workerHref = getAuthorWorkerHref(post.author)

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id)
    } catch {
      /* toast via mutation */
    }
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLead}>
          {workerHref ? (
            <>
              <Link
                href={workerHref}
                prefetch={false}
                className={styles.authorLink}
                aria-label={t("feed.post.viewWorkerProfileAria", {
                  name: authorName,
                })}
              >
                <Avatar
                  className={styles.avatarCell}
                  size={40}
                  src={post.author.avatar ?? undefined}
                  icon={<UserOutlined />}
                />
                <span className={styles.nameCell}>
                  <Typography.Text strong>{authorName}</Typography.Text>
                </span>
              </Link>
              <Typography.Text
                type="secondary"
                className={`${styles.time} ${styles.timeCell}`}
              >
                {dayjs(post.created_at).fromNow()}
              </Typography.Text>
            </>
          ) : (
            <>
              <Avatar
                className={styles.avatarCell}
                size={40}
                src={post.author.avatar ?? undefined}
                icon={<UserOutlined />}
              />
              <span className={styles.nameCell}>
                <Typography.Text strong>{authorName}</Typography.Text>
              </span>
              <Typography.Text
                type="secondary"
                className={`${styles.time} ${styles.timeCell}`}
              >
                {dayjs(post.created_at).fromNow()}
              </Typography.Text>
            </>
          )}
        </div>
        {isAuthor ? (
          <PostCardActions
            onEdit={() => setEditOpen(true)}
            onDelete={handleDelete}
          />
        ) : null}
      </div>

      <PostCardBody
        body={post.body}
        hashtags={post.hashtags}
        basePath={hashtagBasePath}
      />
      <PostCardMedia media={post.media} />

      <Space className={styles.footer} wrap>
        <Button
          type="default"
          icon={<CommentOutlined />}
          onClick={() => setCommentsOpen((o) => !o)}
          aria-expanded={commentsOpen}
          aria-label={t("feed.post.toggleComments")}
        >
          {commentsOpen
            ? t("feed.post.hideComments")
            : t("feed.post.showComments")}
        </Button>
      </Space>

      <CommentThread
        postId={post.id}
        enabled={commentsOpen}
        currentUserId={currentUserId}
      />

      <EditPostModal
        open={editOpen}
        post={post}
        onClose={() => setEditOpen(false)}
      />
    </Card>
  )
}
