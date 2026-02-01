"use client";

import { Card, Row, Col, Space, Tag, Typography } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import {
  TransactionStatus,
  StatusTagColor,
  EMPTY_PLACEHOLDER,
} from "@/lib/constants/wallet";
import { Spacing, ColSpan } from "@/lib/constants/ui.constants";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import styles from "@/app/client/wallet/components/TransactionCard.module.scss";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

interface TransactionCardProps {
  transaction: WalletTransaction;
  formatCurrency: FormatCurrencyFunction;
  t: TFunction;
}

function getStatusTagColor(status: TransactionStatus): string {
  const colorMap: Record<TransactionStatus, StatusTagColor> = {
    [TransactionStatus.PENDING]: StatusTagColor.PENDING,
    [TransactionStatus.SUCCESS]: StatusTagColor.SUCCESS,
    [TransactionStatus.FAILED]: StatusTagColor.FAILED,
    [TransactionStatus.CANCELLED]: StatusTagColor.CANCELLED,
  };
  return colorMap[status] || StatusTagColor.DEFAULT;
}

export function TransactionCard({
  transaction,
  formatCurrency,
  t,
}: TransactionCardProps): React.ReactElement {
  const statusTagColor = getStatusTagColor(transaction.status);

  return (
    <Card size="small">
      <Row gutter={[0, Spacing.SM]}>
        <Col span={ColSpan.FULL}>
          <Space orientation="vertical" size="small" className={styles.space}>
            <Space>
              <Text>{t("wallet.table.amount")}:</Text>
              <Text strong className={styles.amountPrimary}>
                {formatCurrency(transaction.amount)}
              </Text>
            </Space>
            <Space>
              <Text>{t("wallet.table.status")}:</Text>
              <Tag color={statusTagColor}>
                {t(`wallet.transactionStatus.${transaction.status}`)}
              </Tag>
            </Space>
          </Space>
        </Col>
        <Col span={ColSpan.FULL}>
          <Space orientation="vertical" size="small" className={styles.space}>
            {transaction.description && (
              <Space>
                <Text>{t("wallet.table.description")}:</Text>
                <Text>{transaction.description || EMPTY_PLACEHOLDER}</Text>
              </Space>
            )}
            <Space>
              <Text type="secondary" className={styles.secondaryText}>
                {t("wallet.table.createdAt")}: {formatDateTime(transaction.created_at)}
              </Text>
            </Space>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
