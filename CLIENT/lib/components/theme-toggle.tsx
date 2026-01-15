"use client";

import { Button } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "../hooks/use-theme";
import { memo, useMemo } from "react";
import { FontSize } from "../constants/ui.constants";
import { ThemeMode } from "../constants/theme.constants";

const ThemeToggleComponent = () => {
  const { theme, toggleTheme } = useTheme();

  const icon = useMemo(
    () =>
      theme === ThemeMode.LIGHT ? <MoonOutlined /> : <SunOutlined />,
    [theme]
  );

  return (
    <Button
      type="text"
      icon={icon}
      onClick={toggleTheme}
      style={{ fontSize: FontSize.LG }}
    />
  );
};

export const ThemeToggle = memo(ThemeToggleComponent);

