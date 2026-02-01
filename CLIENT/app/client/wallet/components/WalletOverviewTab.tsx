"use client";

import { Card, Row, Col, Typography, Space, Spin } from "antd";
import type { TFunction } from "i18next";
import styles from "@/app/client/wallet/components/WalletOverviewTab.module.scss";

const { Title, Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

type WalletOverviewTabProps = {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  balance: number;
  isLoadingBalance: boolean;
};

export function WalletOverviewTab({
  t,
  formatCurrency,
  balance,
  isLoadingBalance,
}: WalletOverviewTabProps) {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={12} md={6}>
        <Card hoverable className={styles.card}>
          <Space orientation="vertical" size="small" className={styles.space}>
            <Text type="secondary">
              {t("wallet.cards.totalBalance")}
            </Text>
            {isLoadingBalance ? (
              <Spin size="small" />
            ) : (
              <Title level={3} className={styles.balanceTitle}>
                {formatCurrency(balance)}
              </Title>
            )}
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card hoverable className={styles.card}>
          <Space orientation="vertical" size="small" className={styles.space}>
            <Text type="secondary">
              {t("wallet.cards.reconciliationBalance")}
            </Text>
            <Title level={3} className={styles.balanceTitle}>
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card hoverable className={styles.card}>
          <Space orientation="vertical" size="small" className={styles.space}>
            <Text type="secondary">
              {t("wallet.cards.totalDeposited")}
            </Text>
            <Title level={3} className={styles.balanceTitle}>
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card hoverable className={styles.card}>
          <Space orientation="vertical" size="small" className={styles.space}>
            <Text type="secondary">
              {t("wallet.cards.totalWithdrawn")}
            </Text>
            <Title level={3} className={styles.balanceTitle}>
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
