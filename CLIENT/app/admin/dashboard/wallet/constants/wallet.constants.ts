import { TransactionStatus, TransactionType } from "@/lib/constants/wallet";
import { TagColor } from "@/lib/constants/theme.constants";
import { DateRangePreset } from "@/lib/constants/wallet";

export enum TableColumnKeys {
  ID = "_id",
  USER_ID = "user_id",
  TYPE = "type",
  AMOUNT = "amount",
  STATUS = "status",
  GATEWAY = "gateway",
  DESCRIPTION = "description",
  CREATED_AT = "created_at",
}

export const getStatusTagColor = (status: TransactionStatus): string => {
  const colorMap: Record<TransactionStatus, TagColor> = {
    [TransactionStatus.PENDING]: TagColor.ORANGE,
    [TransactionStatus.SUCCESS]: TagColor.GREEN,
    [TransactionStatus.FAILED]: TagColor.RED,
    [TransactionStatus.CANCELLED]: TagColor.DEFAULT,
  };
  return colorMap[status] || TagColor.DEFAULT;
};

export const getTypeTagColor = (type: TransactionType): string => {
  const colorMap: Record<TransactionType, TagColor> = {
    [TransactionType.DEPOSIT]: TagColor.BLUE,
    [TransactionType.WITHDRAW]: TagColor.PURPLE,
    [TransactionType.PAYMENT]: TagColor.CYAN,
    [TransactionType.REFUND]: TagColor.GOLD,
  };
  return colorMap[type] || TagColor.DEFAULT;
};

export enum TabKey {
  STATISTICS = "statistics",
  DATA = "data",
}

export const DATE_RANGE_OPTIONS: Array<{
  value: DateRangePreset;
  labelKey: string;
}> = [
  { value: DateRangePreset.TODAY, labelKey: "admin.wallet.dateRange.today" },
  {
    value: DateRangePreset.YESTERDAY,
    labelKey: "admin.wallet.dateRange.yesterday",
  },
  {
    value: DateRangePreset.LAST_7_DAYS,
    labelKey: "admin.wallet.dateRange.last7Days",
  },
  {
    value: DateRangePreset.LAST_14_DAYS,
    labelKey: "admin.wallet.dateRange.last14Days",
  },
  {
    value: DateRangePreset.THIS_MONTH,
    labelKey: "admin.wallet.dateRange.thisMonth",
  },
];

export const CHART_COLORS = {
  deposit: "rgba(82, 196, 26, 1)",
  withdraw: "rgba(114, 46, 209, 1)",
  payment: "rgba(22, 119, 255, 1)",
  refund: "rgba(250, 173, 20, 1)",
  depositBg: "rgba(82, 196, 26, 0.1)",
  withdrawBg: "rgba(114, 46, 209, 0.1)",
  paymentBg: "rgba(22, 119, 255, 0.1)",
  refundBg: "rgba(250, 173, 20, 0.1)",
} as const;
