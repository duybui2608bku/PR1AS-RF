"use client"

import { Card, Skeleton } from "antd"
import styles from "./feed-skeleton.module.scss"

const CARDS = 5

export const FeedSkeleton = () => (
  <div className={styles.root}>
    {Array.from({ length: CARDS }).map((_, i) => (
      <Card key={i} className={styles.card}>
        <div className={styles.row}>
          <Skeleton.Avatar active size={40} />
          <div className={styles.meta}>
            <Skeleton active title={{ width: 140 }} paragraph={false} />
            <Skeleton active title={{ width: 100 }} paragraph={false} />
          </div>
        </div>
        <Skeleton active paragraph={{ rows: 3 }} title={false} />
      </Card>
    ))}
  </div>
)
