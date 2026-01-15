"use client";

import { Skeleton } from "antd";
import { memo } from "react";

enum ThumbnailCount {
  DEFAULT = 4,
}

enum AspectRatio {
  MAIN = 5 / 4,
  THUMBNAIL = 5 / 4,
}

function ImageGallerySkeletonComponent(): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Skeleton.Image
        active
        style={{
          width: "100%",
          aspectRatio: AspectRatio.MAIN,
          borderRadius: 12,
        }}
      />
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {Array.from({ length: ThumbnailCount.DEFAULT }).map((_, index) => (
          <Skeleton.Image
            key={index}
            active
            style={{
              width: 120,
              aspectRatio: AspectRatio.THUMBNAIL,
              borderRadius: 12,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const ImageGallerySkeleton = memo(ImageGallerySkeletonComponent);
