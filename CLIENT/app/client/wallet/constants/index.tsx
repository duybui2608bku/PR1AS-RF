import type { ColumnsType } from "antd/es/table";
import { Typography, Tag } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import type { Escrow } from "@/lib/types/escrow";
import {
  TransactionStatus,
  StatusTagColor,
  TableColumnWidth,
  TableColumnKey,
  EMPTY_PLACEHOLDER,
} from "@/lib/constants/wallet";
import { EscrowStatus } from "@/lib/types/escrow";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import styles from "@/app/client/wallet/constants/wallet.constants.module.scss";

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

const getEscrowStatusTagColor = (status: EscrowStatus): string => {
  const colorMap: Record<EscrowStatus, StatusTagColor> = {
    [EscrowStatus.HOLDING]: StatusTagColor.PENDING,
    [EscrowStatus.RELEASED]: StatusTagColor.SUCCESS,
    [EscrowStatus.REFUNDED]: StatusTagColor.FAILED,
    [EscrowStatus.PARTIALLY_RELEASED]: StatusTagColor.SUCCESS,
    [EscrowStatus.DISPUTED]: StatusTagColor.PENDING,
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
        <Text strong className={styles.amountPrimary}>
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

export const createEscrowColumns = (
  t: TFunction,
  formatCurrency: FormatCurrencyFunction
): ColumnsType<Escrow> => {
  return [
    {
      title: t("wallet.escrow.table.amount"),
      dataIndex: "amount",
      key: "amount",
      width: TableColumnWidth.AMOUNT,
      render: (amount: number) => (
        <Text strong className={styles.amountPrimary}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: t("wallet.escrow.table.workerPayout"),
      dataIndex: "worker_payout",
      key: "worker_payout",
      width: TableColumnWidth.AMOUNT,
      render: (workerPayout: number) => formatCurrency(workerPayout),
    },
    {
      title: t("wallet.escrow.table.platformFee"),
      dataIndex: "platform_fee",
      key: "platform_fee",
      width: TableColumnWidth.AMOUNT,
      render: (platformFee: number) => formatCurrency(platformFee),
    },
    {
      title: t("wallet.escrow.table.status"),
      dataIndex: "status",
      key: "status",
      width: TableColumnWidth.STATUS,
      render: (status: EscrowStatus) => (
        <Tag color={getEscrowStatusTagColor(status)}>
          {t(`wallet.escrow.status.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("wallet.escrow.table.serviceCode"),
      dataIndex: "booking_id",
      key: "service_code",
      ellipsis: true,
      render: (bookingId: Escrow["booking_id"]) => {
        if (bookingId && typeof bookingId === "object" && "service_code" in bookingId) {
          return bookingId.service_code;
        }
        return EMPTY_PLACEHOLDER;
      },
    },
    {
      title: t("wallet.escrow.table.heldAt"),
      dataIndex: "held_at",
      key: "held_at",
      width: TableColumnWidth.CREATED_AT,
      render: (heldAt: string) => formatDateTime(heldAt),
    },
  ];
};
