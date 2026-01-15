import type { ColumnsType } from "antd/es/table";
import { Typography, Tag } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import { TransactionStatus } from "@/lib/constants/wallet";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";

const { Text } = Typography;

enum TableColumnWidth {
  AMOUNT = 150,
  STATUS = 120,
  CREATED_AT = 180,
}

enum TableColumnKeys {
  AMOUNT = "amount",
  STATUS = "status",
  DESCRIPTION = "description",
  CREATED_AT = "created_at",
}

const getStatusTagColor = (status: TransactionStatus): string => {
  const colorMap: Record<TransactionStatus, string> = {
    [TransactionStatus.PENDING]: "orange",
    [TransactionStatus.SUCCESS]: "green",
    [TransactionStatus.FAILED]: "red",
    [TransactionStatus.CANCELLED]: "default",
  };
  return colorMap[status] || "default";
};

type FormatCurrencyFunction = (amount: number) => string;

export const createWalletTransactionColumns = (
  t: TFunction,
  formatCurrency: FormatCurrencyFunction
): ColumnsType<WalletTransaction> => {
  return [
    {
      title: t("wallet.table.amount"),
      dataIndex: TableColumnKeys.AMOUNT,
      key: TableColumnKeys.AMOUNT,
      width: TableColumnWidth.AMOUNT,
      render: (amount: number) => (
        <Text strong style={{ color: "var(--ant-color-primary)" }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: t("wallet.table.status"),
      dataIndex: TableColumnKeys.STATUS,
      key: TableColumnKeys.STATUS,
      width: TableColumnWidth.STATUS,
      render: (status: TransactionStatus) => (
        <Tag color={getStatusTagColor(status)}>
          {t(`wallet.transactionStatus.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("wallet.table.description"),
      dataIndex: TableColumnKeys.DESCRIPTION,
      key: TableColumnKeys.DESCRIPTION,
      ellipsis: true,
      render: (description: string | undefined) => description || "-",
    },
    {
      title: t("wallet.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: TableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];
};
