"use client";

import { useState } from "react";
import {
  Layout,
  Card,
  Tabs,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Space,
  Spin,
  Button,
} from "antd";
import {
  WalletOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { walletApi } from "@/lib/api/wallet.api";
import type {
  WalletTransaction,
  TransactionHistoryQuery,
} from "@/lib/api/wallet.api";
import { TransactionType, TransactionStatus } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { DepositModal } from "@/lib/components/deposit-modal";
import { formatDateTime } from "@/app/func/func";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
} from "@/app/constants/constants";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

enum WalletTabKey {
  OVERVIEW = "overview",
  DEPOSIT_HISTORY = "deposit",
  WITHDRAW_HISTORY = "withdraw",
}

enum TableColumnKeys {
  ID = "id",
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

function WalletContent() {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [activeTab, setActiveTab] = useState<WalletTabKey>(
    WalletTabKey.OVERVIEW
  );
  const [depositPage, setDepositPage] = useState<number>(
    PAGINATION_DEFAULTS.PAGE
  );
  const [depositLimit, setDepositLimit] = useState<number>(
    PAGINATION_DEFAULTS.LIMIT
  );
  const [withdrawPage, setWithdrawPage] = useState<number>(
    PAGINATION_DEFAULTS.PAGE
  );
  const [withdrawLimit, setWithdrawLimit] = useState<number>(
    PAGINATION_DEFAULTS.LIMIT
  );
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: walletApi.getBalance,
    retry: false,
  });

  const depositQuery: TransactionHistoryQuery = {
    type: TransactionType.DEPOSIT,
    page: depositPage,
    limit: depositLimit,
  };

  const { data: depositHistory, isLoading: isLoadingDeposits } = useQuery({
    queryKey: ["wallet-deposit-history", depositQuery],
    queryFn: () => walletApi.getTransactionHistory(depositQuery),
    retry: false,
  });

  const withdrawQuery: TransactionHistoryQuery = {
    type: TransactionType.WITHDRAW,
    page: withdrawPage,
    limit: withdrawLimit,
  };

  const { data: withdrawHistory, isLoading: isLoadingWithdraws } = useQuery({
    queryKey: ["wallet-withdraw-history", withdrawQuery],
    queryFn: () => walletApi.getTransactionHistory(withdrawQuery),
    retry: false,
  });

  const handleTabChange = (key: string): void => {
    setActiveTab(key as WalletTabKey);
  };

  const handleDepositTableChange = (page: number, pageSize: number): void => {
    setDepositPage(page);
    setDepositLimit(pageSize);
  };

  const handleWithdrawTableChange = (page: number, pageSize: number): void => {
    setWithdrawPage(page);
    setWithdrawLimit(pageSize);
  };

  const depositColumns: ColumnsType<WalletTransaction> = [
    {
      title: t("wallet.table.amount"),
      dataIndex: TableColumnKeys.AMOUNT,
      key: TableColumnKeys.AMOUNT,
      width: 150,
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
      width: 120,
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
      width: 180,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];

  const withdrawColumns: ColumnsType<WalletTransaction> = [
    {
      title: t("wallet.table.amount"),
      dataIndex: TableColumnKeys.AMOUNT,
      key: TableColumnKeys.AMOUNT,
      width: 150,
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
      width: 120,
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
      width: 180,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "var(--ant-color-bg-container)",
      }}
    >
      <Header />
      <Content style={{ padding: "24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Space
            style={{
              marginBottom: 24,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title
              level={2}
              style={{ margin: 0, color: "var(--ant-color-primary)" }}
            >
              {t("wallet.title")}
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setDepositModalOpen(true)}
            >
              {t("wallet.deposit.title")}
            </Button>
          </Space>

          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="large"
            style={{ marginBottom: 24 }}
          >
            <TabPane
              tab={
                <span>
                  <WalletOutlined />
                  {t("wallet.tabs.overview")}
                </span>
              }
              key={WalletTabKey.OVERVIEW}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    style={{ cursor: "pointer" }}
                    bodyStyle={{ padding: "24px" }}
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
                          {formatCurrency(balanceData?.balance || 0)}
                        </Title>
                      )}
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    style={{ cursor: "pointer" }}
                    bodyStyle={{ padding: "24px" }}
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
                    style={{ cursor: "pointer" }}
                    bodyStyle={{ padding: "24px" }}
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
                    style={{ cursor: "pointer" }}
                    bodyStyle={{ padding: "24px" }}
                  >
                    <Space
                      direction="vertical"
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
            </TabPane>

            <TabPane
              tab={
                <span>
                  <ArrowUpOutlined />
                  {t("wallet.tabs.depositHistory")}
                </span>
              }
              key={WalletTabKey.DEPOSIT_HISTORY}
            >
              <Card>
                <Table<WalletTransaction>
                  columns={depositColumns}
                  dataSource={depositHistory?.data || []}
                  loading={isLoadingDeposits}
                  rowKey={(record) => record.id}
                  pagination={{
                    current: depositPage,
                    pageSize: depositLimit,
                    total: depositHistory?.pagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) =>
                      t("common.pagination.total", { total }),
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                  }}
                  onChange={(pagination) => {
                    handleDepositTableChange(
                      pagination.current || PAGINATION_DEFAULTS.PAGE,
                      pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
                    );
                  }}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <ArrowDownOutlined />
                  {t("wallet.tabs.withdrawHistory")}
                </span>
              }
              key={WalletTabKey.WITHDRAW_HISTORY}
            >
              <Card>
                <Table<WalletTransaction>
                  columns={withdrawColumns}
                  dataSource={withdrawHistory?.data || []}
                  loading={isLoadingWithdraws}
                  rowKey={(record) => record.id}
                  pagination={{
                    current: withdrawPage,
                    pageSize: withdrawLimit,
                    total: withdrawHistory?.pagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) =>
                      t("common.pagination.total", { total }),
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                  }}
                  onChange={(pagination) => {
                    handleWithdrawTableChange(
                      pagination.current || PAGINATION_DEFAULTS.PAGE,
                      pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
                    );
                  }}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            </TabPane>
          </Tabs>
        </div>
      </Content>
      <Footer />
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />
    </Layout>
  );
}

export default function WalletPage() {
  return (
    <AuthGuard>
      <WalletContent />
    </AuthGuard>
  );
}
