"use client"

import { Button, Dropdown, Modal } from "antd"
import type { MenuProps } from "antd"
import { EditOutlined, DeleteOutlined, EllipsisOutlined } from "@ant-design/icons"
import { useTranslation } from "react-i18next"

interface PostCardActionsProps {
  onEdit: () => void
  onDelete: () => void | Promise<void>
}

export const PostCardActions = ({
  onEdit,
  onDelete,
}: PostCardActionsProps) => {
  const { t } = useTranslation()

  const items: MenuProps["items"] = [
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

  const handleMenuClick: MenuProps["onClick"] = ({ key, domEvent }) => {
    domEvent.stopPropagation()
    if (key === "edit") {
      onEdit()
      return
    }
    if (key === "delete") {
      Modal.confirm({
        title: t("feed.post.deleteConfirm"),
        okText: t("common.confirm"),
        cancelText: t("common.cancel"),
        onOk: () => Promise.resolve(onDelete()),
      })
    }
  }

  return (
    <Dropdown
      menu={{ items, onClick: handleMenuClick }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<EllipsisOutlined />}
        aria-label={t("feed.post.actions")}
        aria-haspopup="menu"
      />
    </Dropdown>
  )
}
