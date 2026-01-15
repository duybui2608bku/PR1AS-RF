"use client";

import { Card, Skeleton } from "antd";
import { ImageHeight, BorderRadius } from "@/lib/constants/ui.constants";
import { memo } from "react";

interface ServiceCardSkeletonProps {
  size?: "small" | "medium" | "large";
}

enum SkeletonRows {
  CONTENT = 3,
}

function ServiceCardSkeletonComponent({ size = "medium" }: ServiceCardSkeletonProps): JSX.Element {
  const imageHeight = size === "large" ? ImageHeight.LARGE : size === "medium" ? ImageHeight.MEDIUM : ImageHeight.SMALL;

  return (
    <Card
      style={{
        borderRadius: `${BorderRadius.LARGE}px`,
        border: "1px solid #E5E5E5",
        overflow: "hidden",
        background: "#FFFFFF",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      styles={{
        body: {
          padding: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Skeleton.Image
        style={{
          width: "100%",
          height: imageHeight,
        }}
        active
      />
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <Skeleton
          active
          paragraph={{ rows: SkeletonRows.CONTENT }}
        />
      </div>
    </Card>
  );
}

export const ServiceCardSkeleton = memo(ServiceCardSkeletonComponent);
