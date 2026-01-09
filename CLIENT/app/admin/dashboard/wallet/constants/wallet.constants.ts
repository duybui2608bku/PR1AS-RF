import { TransactionStatus, TransactionType } from "@/lib/constants/wallet";

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
  const colorMap: Record<TransactionStatus, string> = {
    [TransactionStatus.PENDING]: "orange",
    [TransactionStatus.SUCCESS]: "green",
    [TransactionStatus.FAILED]: "red",
    [TransactionStatus.CANCELLED]: "default",
  };
  return colorMap[status] || "default";
};

export const getTypeTagColor = (type: TransactionType): string => {
  const colorMap: Record<TransactionType, string> = {
    [TransactionType.DEPOSIT]: "blue",
    [TransactionType.WITHDRAW]: "purple",
    [TransactionType.PAYMENT]: "cyan",
    [TransactionType.REFUND]: "gold",
  };
  return colorMap[type] || "default";
};
