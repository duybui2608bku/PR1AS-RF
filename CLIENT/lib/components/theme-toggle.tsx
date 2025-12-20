"use client";

import { Button } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "../hooks/use-theme";

/**
 * Component chuyển đổi theme sáng/tối
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="text"
      icon={theme === "light" ? <MoonOutlined /> : <SunOutlined />}
      onClick={toggleTheme}
      style={{ fontSize: 18 }}
    />
  );
}

