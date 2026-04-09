"use client";

import { VerticalAlignTopOutlined } from "@ant-design/icons";
import { FloatButton } from "antd";

export function BackToTopButton() {
  const scrollBehavior =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  return (
    <FloatButton
      icon={<VerticalAlignTopOutlined />}
      onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior })}
      aria-label="Back to top"
    />
  );
}
