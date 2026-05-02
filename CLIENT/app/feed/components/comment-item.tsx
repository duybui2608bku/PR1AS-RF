"use client"

import { useState } from "react"
import { Avatar, Button, Dropdown, Input, Modal, Typography } from "antd"
import type { MenuProps } from "antd"
import {
  UserOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"
import type { CommentFlat } from "@/lib/types/post"
import { updateCommentBodySchema } from "@/lib/types/post"
import { useUpdateComment } from "@/lib/hooks/use-update-comment"
import { useDeleteComment } from "@/lib/hooks/use-delete-comment"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import styles from "./comment-item.module.scss"

interface CommentItemProps {
  comment: CommentFlat
  postId: string
  threadRootId: string
  currentUserId?: string
  isNested?: boolean
  /** `anchorCommentId` = id của hàng comment user bấm Trả lời (để hiển thị composer đúng chỗ). */
  onReply?: (threadRootId: string, anchorCommentId: string) => void
}

export const CommentItem = ({
  comment,
  postId,
  threadRootId,
  currentUserId,
  isNested,
  onReply,
}: CommentItemProps) => {
  const { t } = useTranslation()
  const { handleError } = useErrorHandler()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState(comment.body)

  const isAuthor = currentUserId === comment.author.id
  const displayName =
    comment.author.full_name?.trim() ||
    t("feed.comments.anonymous")

  const openDeleteConfirm = () => {
    Modal.confirm({
      title: t("feed.comments.deleteConfirm"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        await deleteComment.mutateAsync({
          postId,
          commentId: comment.id,
        })
      },
    })
  }

  const commentMenuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: t("common.edit"),
      icon: <EditOutlined />,
    },
    {
      key: "delete",
      label: t("common.delete"),
      icon: <DeleteOutlined />,
      danger: true,
    },
  ]

  const handleCommentMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "edit") {
      setEditDraft(comment.body)
      setEditOpen(true)
      return
    }
    if (key === "delete") {
      openDeleteConfirm()
    }
  }

  const handleSaveEdit = async () => {
    const parsed = updateCommentBodySchema.safeParse({ body: editDraft })
    if (!parsed.success) {
      handleError(new Error(t("feed.comments.validation")))
      return
    }
    try {
      await updateComment.mutateAsync({
        postId,
        commentId: comment.id,
        body: parsed.data.body,
      })
      setEditOpen(false)
    } catch {
      /* handled */
    }
  }

  return (
    <div
      className={`${styles.row} ${isNested ? styles.nested : ""}`}
      style={{ marginLeft: isNested ? 28 : 0 }}
    >
      <Avatar
        size={isNested ? "small" : "default"}
        src={comment.author.avatar ?? undefined}
        icon={<UserOutlined />}
      />
      <div className={styles.body}>
        <div className={styles.meta}>
          <Typography.Text strong>{displayName}</Typography.Text>
          <Typography.Text type="secondary" className={styles.time}>
            {dayjs(comment.created_at).format("DD/MM/YYYY HH:mm")}
          </Typography.Text>
        </div>
        <Typography.Paragraph className={styles.text} style={{ marginBottom: 8 }}>
          {comment.body}
        </Typography.Paragraph>
        <div className={styles.actions}>
          {onReply ? (
            <Button
              type="link"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => onReply(threadRootId, comment.id)}
              aria-label={t("feed.comments.reply")}
            >
              {t("feed.comments.reply")}
            </Button>
          ) : null}
          {isAuthor ? (
            <Dropdown
              menu={{
                items: commentMenuItems,
                onClick: handleCommentMenuClick,
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={<EllipsisOutlined />}
                aria-label={t("feed.comments.actionsMenu")}
                aria-haspopup="menu"
              />
            </Dropdown>
          ) : null}
        </div>
      </div>

      <Modal
        title={t("feed.comments.editTitle")}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => void handleSaveEdit()}
        okButtonProps={{ loading: updateComment.isPending }}
      >
        <Input.TextArea
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          rows={4}
          maxLength={2000}
        />
      </Modal>
    </div>
  )
}
