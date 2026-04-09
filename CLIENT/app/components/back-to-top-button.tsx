"use client";

import { VerticalAlignTopOutlined } from "@ant-design/icons";
import { FloatButton } from "antd";

export function BackToTopButton() {
  return (
    <FloatButton
      icon={<VerticalAlignTopOutlined />}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    />
  );
}
