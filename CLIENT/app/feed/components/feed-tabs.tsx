"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AppRoute } from "@/lib/constants/routes"
import {
  buildFeedTabAllHref,
  buildFeedTabMineHref,
} from "../utils/feed-href"
import styles from "./feed-tabs.module.scss"

interface FeedTabsProps {
  basePath?: string
}

export const FeedTabs = ({ basePath = AppRoute.FEED }: FeedTabsProps) => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  const tab = searchParams.get("tab") === "mine" ? "mine" : "all"

  const hrefAll = useMemo(
    () => buildFeedTabAllHref(basePath, searchParams),
    [basePath, searchParams]
  )

  const hrefMine = useMemo(
    () => buildFeedTabMineHref(basePath, searchParams),
    [basePath, searchParams]
  )

  return (
    <nav className={styles.wrap} aria-label={t("feed.tabs.groupAria")}>
      <Link
        href={hrefAll}
        prefetch
        className={`${styles.tab} ${tab === "all" ? styles.tabActive : ""}`}
      >
        {t("feed.tabs.all")}
      </Link>
      <Link
        href={hrefMine}
        prefetch
        className={`${styles.tab} ${tab === "mine" ? styles.tabActive : ""}`}
      >
        {t("feed.tabs.mine")}
      </Link>
    </nav>
  )
}
