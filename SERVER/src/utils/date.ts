import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { TOKEN_EXPIRY } from "../constants/time";

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export const addMinutesToDate = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const addHoursToDate = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const createPasswordResetExpiry = (): Date => {
  return addMinutesToDate(new Date(), TOKEN_EXPIRY.PASSWORD_RESET_MINUTES);
};

export const createEmailVerificationExpiry = (): Date => {
  return addHoursToDate(new Date(), TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS);
};

export default dayjs;
