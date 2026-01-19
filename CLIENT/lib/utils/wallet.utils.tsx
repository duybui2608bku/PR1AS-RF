import type { ColumnsType } from "antd/es/table";
import { Typography, Tag } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import {
  TransactionStatus,
  StatusTagColor,
  TableColumnWidth,
  TableColumnKey,
  EMPTY_PLACEHOLDER,
} from "@/lib/constants/wallet";
import { ThemeCSSVariable } from "@/lib/constants/theme.constants";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";

const { Text } = Typography;

const getStatusTagColor = (status: TransactionStatus): string => {
  const colorMap: Record<TransactionStatus, StatusTagColor> = {
    [TransactionStatus.PENDING]: StatusTagColor.PENDING,
    [TransactionStatus.SUCCESS]: StatusTagColor.SUCCESS,
    [TransactionStatus.FAILED]: StatusTagColor.FAILED,
    [TransactionStatus.CANCELLED]: StatusTagColor.CANCELLED,
  };
  return colorMap[status] || StatusTagColor.DEFAULT;
};

type FormatCurrencyFunction = (amount: number) => string;

export const createWalletTransactionColumns = (
  t: TFunction,
  formatCurrency: FormatCurrencyFunction
): ColumnsType<WalletTransaction> => {
  return [
    {
      title: t("wallet.table.amount"),
      dataIndex: TableColumnKey.AMOUNT,
      key: TableColumnKey.AMOUNT,
      width: TableColumnWidth.AMOUNT,
      render: (amount: number) => (
        <Text strong style={{ color: `var(${ThemeCSSVariable.ANT_COLOR_PRIMARY})` }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: t("wallet.table.status"),
      dataIndex: TableColumnKey.STATUS,
      key: TableColumnKey.STATUS,
      width: TableColumnWidth.STATUS,
      render: (status: TransactionStatus) => (
        <Tag color={getStatusTagColor(status)}>
          {t(`wallet.transactionStatus.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("wallet.table.description"),
      dataIndex: TableColumnKey.DESCRIPTION,
      key: TableColumnKey.DESCRIPTION,
      ellipsis: true,
      render: (description: string | undefined) => description || EMPTY_PLACEHOLDER,
    },
    {
      title: t("wallet.table.createdAt"),
      dataIndex: TableColumnKey.CREATED_AT,
      key: TableColumnKey.CREATED_AT,
      width: TableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];
};
