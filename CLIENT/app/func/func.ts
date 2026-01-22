import dayjs from "dayjs";

  export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};


export const expireDate = (date: string | Date | dayjs.Dayjs): boolean => {
  return dayjs(date).isBefore(dayjs(), 'day');
};