import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TFunction } from "i18next";
import type { UserProfile } from "@/lib/api";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import type { TransactionStatus, TransactionType } from "@/lib/constants/wallet";
import { formatDateTime } from "@/app/func/func";
import {
  TableColumnKeys,
  getStatusTagColor,
  getTypeTagColor,
} from "./wallet.constants";

interface BuildWalletColumnsParams {
  t: TFunction;
  formatCurrency: (amount: number, currency: string) => string;
}

export const buildWalletColumns = ({
  t,
  formatCurrency,
}: BuildWalletColumnsParams): ColumnsType<WalletTransaction> => [
  {
    title: t("admin.wallet.table.id"),
    dataIndex: TableColumnKeys.ID,
    key: TableColumnKeys.ID,
    width: 100,
    ellipsis: true,
  },
  {
    title: t("admin.wallet.table.userId"),
    dataIndex: TableColumnKeys.USER_ID,
    key: TableColumnKeys.USER_ID,
    width: 150,
    render: (user: UserProfile | string) =>
      (user as UserProfile).full_name || (user as string),
  },
  {
    title: t("admin.wallet.table.type"),
    dataIndex: TableColumnKeys.TYPE,
    key: TableColumnKeys.TYPE,
    width: 120,
    render: (type: TransactionType) => (
      <Tag color={getTypeTagColor(type)}>{t(`wallet.transactionType.${type}`)}</Tag>
    ),
  },
  {
    title: t("admin.wallet.table.amount"),
    dataIndex: TableColumnKeys.AMOUNT,
    key: TableColumnKeys.AMOUNT,
    width: 150,
    render: (amount: number, record: WalletTransaction) =>
      formatCurrency(amount, record.currency),
  },
  {
    title: t("admin.wallet.table.status"),
    dataIndex: TableColumnKeys.STATUS,
    key: TableColumnKeys.STATUS,
    width: 120,
    render: (status: TransactionStatus) => (
      <Tag color={getStatusTagColor(status)}>
        {t(`wallet.transactionStatus.${status}`)}
      </Tag>
    ),
  },
  {
    title: t("admin.wallet.table.gateway"),
    dataIndex: TableColumnKeys.GATEWAY,
    key: TableColumnKeys.GATEWAY,
    width: 150,
    render: (gateway: string | undefined) => gateway || "-",
  },
  {
    title: t("admin.wallet.table.description"),
    dataIndex: TableColumnKeys.DESCRIPTION,
    key: TableColumnKeys.DESCRIPTION,
    ellipsis: true,
    render: (description: string | undefined) => description || "-",
  },
  {
    title: t("admin.wallet.table.createdAt"),
    dataIndex: TableColumnKeys.CREATED_AT,
    key: TableColumnKeys.CREATED_AT,
    width: 180,
    render: (createdAt: string) => formatDateTime(createdAt),
  },
];
