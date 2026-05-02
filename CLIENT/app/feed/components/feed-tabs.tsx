"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import styles from "./feed-tabs.module.scss"

export const FeedTabs = () => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  const tab = searchParams.get("tab") === "mine" ? "mine" : "all"

  const hrefAll = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete("tab")
    const qs = next.toString()
    return qs ? `/feed?${qs}` : "/feed"
  }, [searchParams])

  const hrefMine = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("tab", "mine")
    return `/feed?${next.toString()}`
  }, [searchParams])

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
