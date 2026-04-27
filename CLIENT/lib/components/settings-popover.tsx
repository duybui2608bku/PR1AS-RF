"use client";

import { Popover, Space, Button } from "antd";
import { SettingOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "../hooks/use-theme";
import { ThemeMode } from "../constants/theme.constants";

export function SettingsPopover() {
  const { theme, toggleTheme } = useTheme();

  const content = (
    <Space orientation="vertical" size="middle" style={{ minWidth: 200 }}>
      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Giao diện</div>
        <Button
          type="text"
          icon={theme === ThemeMode.LIGHT ? <MoonOutlined /> : <SunOutlined />}
          onClick={toggleTheme}
          style={{ width: "100%", textAlign: "left" }}
        >
          {theme === ThemeMode.LIGHT ? "Chế độ tối" : "Chế độ sáng"}
        </Button>
      </div>
    </Space>
  );

  return (
    <Popover
      content={content}
      title="Cài đặt"
      trigger="click"
      placement="bottomRight"
    >
      <Button type="text" icon={<SettingOutlined />} style={{ fontSize: 18 }} />
    </Popover>
  );
}
