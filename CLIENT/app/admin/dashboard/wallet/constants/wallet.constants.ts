import { TransactionStatus, TransactionType } from "@/lib/constants/wallet";
import { TagColor } from "@/lib/constants/theme.constants";

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
