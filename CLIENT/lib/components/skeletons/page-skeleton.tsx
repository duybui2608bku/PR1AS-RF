"use client";

import { Skeleton } from "antd";

enum SkeletonRows {
  TITLE = 1,
  CONTENT = 3,
  CARD = 2,
}

export function PageSkeleton(): JSX.Element {
  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <Skeleton
        active
        paragraph={{ rows: SkeletonRows.TITLE }}
        style={{ marginBottom: 24 }}
      />
      <Skeleton
        active
        paragraph={{ rows: SkeletonRows.CONTENT }}
        style={{ marginBottom: 24 }}
      />
      <Skeleton
        active
        paragraph={{ rows: SkeletonRows.CARD }}
      />
    </div>
  );
}
