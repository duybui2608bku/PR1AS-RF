import { useTranslation } from "react-i18next";

export const formatTime = (
  dateString: string | undefined,
  t: (key: string, options?: { count?: number }) => string
): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("chat.time.justNow");
  if (minutes < 60) return t("chat.time.minutesAgo", { count: minutes });
  if (hours < 24) return t("chat.time.hoursAgo", { count: hours });
  if (days < 7) return t("chat.time.daysAgo", { count: days });
  return date.toLocaleDateString();
};

