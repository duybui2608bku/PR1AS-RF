import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

// Load plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);

// Set default timezone (Vietnam)
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export default dayjs;

// Helper functions
export const formatDate = (
  date: Date | string,
  format = "YYYY-MM-DD HH:mm:ss"
): string => {
  return dayjs(date).format(format);
};

export const formatDateVN = (date: Date | string): string => {
  return dayjs(date).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");
};

export const getCurrentDate = (): Date => {
  return dayjs().toDate();
};

export const addDays = (date: Date | string, days: number): Date => {
  return dayjs(date).add(days, "day").toDate();
};

export const isAfter = (
  date1: Date | string,
  date2: Date | string
): boolean => {
  return dayjs(date1).isAfter(dayjs(date2));
};

export const isBefore = (
  date1: Date | string,
  date2: Date | string
): boolean => {
  return dayjs(date1).isBefore(dayjs(date2));
};
