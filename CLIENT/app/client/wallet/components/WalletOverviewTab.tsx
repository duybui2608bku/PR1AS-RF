"use client";

import { Card, Row, Col, Typography, Space, Spin } from "antd";
import type { TFunction } from "i18next";

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
        <Card
          hoverable
          style={{ cursor: "pointer", padding: "24px" }}
        >
          <Space
            orientation="vertical"
            size="small"
            style={{ width: "100%" }}
          >
            <Text type="secondary">
              {t("wallet.cards.totalBalance")}
            </Text>
            {isLoadingBalance ? (
              <Spin size="small" />
            ) : (
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: "var(--ant-color-primary)",
                  fontWeight: "bold",
                }}
              >
                {formatCurrency(balance)}
              </Title>
            )}
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card
          hoverable
          style={{ cursor: "pointer", padding: "24px" }}
        >
          <Space
            orientation="vertical"
            size="small"
            style={{ width: "100%" }}
          >
            <Text type="secondary">
              {t("wallet.cards.reconciliationBalance")}
            </Text>
            <Title
              level={3}
              style={{
                margin: 0,
                color: "var(--ant-color-primary)",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card
          hoverable
          style={{ cursor: "pointer", padding: "24px" }}
        >
          <Space
            orientation="vertical"
            size="small"
            style={{ width: "100%" }}
          >
            <Text type="secondary">
              {t("wallet.cards.totalDeposited")}
            </Text>
            <Title
              level={3}
              style={{
                margin: 0,
                color: "var(--ant-color-primary)",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>

      <Col xs={24} sm={12} md={6}>
        <Card
          hoverable
          style={{ cursor: "pointer", padding: "24px" }}
        >
          <Space
            orientation="vertical"
            size="small"
            style={{ width: "100%" }}
          >
            <Text type="secondary">
              {t("wallet.cards.totalWithdrawn")}
            </Text>
            <Title
              level={3}
              style={{
                margin: 0,
                color: "var(--ant-color-primary)",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(0)}
            </Title>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
