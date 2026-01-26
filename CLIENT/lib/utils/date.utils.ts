import dayjs, { type Dayjs } from "dayjs";
import { DateRangePreset } from "@/lib/constants/wallet";

export function getDateRangeFromPreset(
  preset: DateRangePreset
): [Dayjs, Dayjs] {
  const now = dayjs();

  switch (preset) {
    case DateRangePreset.TODAY:
      return [now.startOf("day"), now.endOf("day")];
    case DateRangePreset.YESTERDAY:
      return [
        now.subtract(1, "day").startOf("day"),
        now.subtract(1, "day").endOf("day"),
      ];
    case DateRangePreset.LAST_7_DAYS:
      return [now.subtract(6, "day").startOf("day"), now.endOf("day")];
    case DateRangePreset.LAST_14_DAYS:
      return [now.subtract(13, "day").startOf("day"), now.endOf("day")];
    case DateRangePreset.THIS_MONTH:
      return [now.startOf("month"), now.endOf("day")];
    default:
      return [now.startOf("day"), now.endOf("day")];
  }
}
