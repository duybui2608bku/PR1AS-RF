"use client";

import { Card, Skeleton } from "antd";
import { memo } from "react";
import styles from "./service-card-skeleton.module.scss";

interface ServiceCardSkeletonProps {
  size?: "small" | "medium" | "large";
}

enum SkeletonRows {
  CONTENT = 2,
}

function ServiceCardSkeletonComponent({
  size = "medium",
}: ServiceCardSkeletonProps) {
  const sizeClass =
    size === "large"
      ? styles.sizeLarge
      : size === "small"
      ? styles.sizeSmall
      : styles.sizeMedium;

  return (
    <Card className={styles.card}>
      <div className={`${styles.imageSlot} ${sizeClass}`}>
        <Skeleton.Image active className={styles.skeletonImage} />
      </div>
      <div className={styles.content}>
        <Skeleton
          active
          title={{ width: "70%" }}
          paragraph={{ rows: SkeletonRows.CONTENT, width: ["100%", "60%"] }}
        />
      </div>
    </Card>
  );
}

export const ServiceCardSkeleton = memo(ServiceCardSkeletonComponent);
