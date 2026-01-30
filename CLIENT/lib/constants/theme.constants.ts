export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
}

export enum ThemeStorageKey {
  THEME = "theme-storage",
}

export enum ThemeColor {
  PRIMARY = "#711111",
  DARK_BG_PRIMARY = "#000000",
  DARK_BG_SECONDARY = "#141414",
  LIGHT_BG_PRIMARY = "#ffffff",
  LIGHT_BG_SECONDARY = "#f5f5f5",
  DARK_TEXT_PRIMARY = "#ffffff",
  DARK_TEXT_SECONDARY = "#b3b3b3",
  LIGHT_TEXT_PRIMARY = "#0f172a",
  LIGHT_TEXT_SECONDARY = "#475569",
  TEXT_ON_PRIMARY = "#ffffff",
}

export enum ThemeOpacity {
  DARK_TEXT_PRIMARY = 0.85,
  DARK_BORDER = 0.1,
  LIGHT_BORDER = 0.06,
  DARK_FILL = 0.06,
  LIGHT_FILL = 0.04,
}

export enum ThemeTransition {
  DURATION = 200,
  TIMING = "ease-in-out",
}

export enum ThemeBorderRadius {
  SMALL = 4,
  MEDIUM = 8,
  LARGE = 12,
}

export enum ThemeFontSize {
  SM = 14,
  MD = 16,
  LG = 18,
}

export enum ThemeCSSVariable {
  COLOR_PRIMARY = "--color-primary",
  BACKGROUND = "--background",
  BACKGROUND_SECONDARY = "--background-secondary",
  FOREGROUND = "--foreground",
  FOREGROUND_SECONDARY = "--foreground-secondary",
  TEXT_ON_PRIMARY = "--text-on-primary",
  BORDER_SECONDARY = "--border-secondary",
  FILL_TERTIARY = "--fill-tertiary",
  ANT_COLOR_PRIMARY = "--ant-color-primary",
  ANT_COLOR_BG_CONTAINER = "--ant-color-bg-container",
  ANT_COLOR_BORDER_SECONDARY = "--ant-color-border-secondary",
  ANT_COLOR_FILL_TERTIARY = "--ant-color-fill-tertiary",
}

export enum ThemeAttribute {
  DATA_THEME = "data-theme",
}

export const ThemeDefault = {
  MODE: ThemeMode.LIGHT,
  PRIMARY_COLOR: ThemeColor.PRIMARY,
} as const;

export enum TagColor {
  ORANGE = "orange",
  BLUE = "blue",
  GREEN = "green",
  RED = "red",
  PURPLE = "purple",
  VOLCANO = "volcano",
  CYAN = "cyan",
  GOLD = "gold",
  PROCESSING = "processing",
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  DEFAULT = "default",
}
