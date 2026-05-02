"use client"

import { Empty } from "antd"
import { useTranslation } from "react-i18next"

export const FeedEmpty = () => {
  const { t } = useTranslation()
  return (
    <Empty
      description={t("feed.empty.description")}
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  )
}
