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
  Space,
  Tag,
} from "antd";
import {
  WalletOutlined,
  TransactionOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { escrowApi } from "@/lib/api/escrow.api";
import type { Escrow, EscrowQuery } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
} from "@/app/constants/constants";
import { QueryState } from "@/lib/components/query-state";

const { Title, Text } = Typography;
const { Content } = Layout;

enum WorkerWalletTabKey {
  BALANCE = "balance",
  RECONCILIATION = "reconciliation",
}

const FAKE_BALANCE = 5000000;
const FAKE_RECONCILIATION_BALANCE = 3000000;
const FAKE_PENDING_WITHDRAWAL = 2000000;

function WorkerWalletContent() {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [activeTab, setActiveTab] = useState<WorkerWalletTabKey>(
    WorkerWalletTabKey.BALANCE
  );
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const [limit, setLimit] = useState<number>(PAGINATION_DEFAULTS.LIMIT);

  const escrowQuery: EscrowQuery = {
    page,
    limit,
  };

  const {
    data: escrowData,
    isLoading: isLoadingEscrows,
    isError: isEscrowError,
    error: escrowError,
  } = useQuery({
    queryKey: ["worker-escrows", escrowQuery],
    queryFn: () => escrowApi.getMyEscrows(escrowQuery),
    enabled: activeTab === WorkerWalletTabKey.RECONCILIATION,
    retry: false,
  });

  const handleTabChange = (key: string): void => {
    setActiveTab(key as WorkerWalletTabKey);
  };

  const handleTableChange = (newPage: number, newPageSize: number): void => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const getStatusTag = (status: EscrowStatus): JSX.Element => {
    const statusConfig: Record<EscrowStatus, { color: string; label: string }> = {
      [EscrowStatus.HOLDING]: {
        color: "processing",
        label: t("escrow.status.holding") || "Holding",
      },
      [EscrowStatus.RELEASED]: {
        color: "success",
        label: t("escrow.status.released") || "Released",
      },
      [EscrowStatus.REFUNDED]: {
        color: "error",
        label: t("escrow.status.refunded") || "Refunded",
      },
      [EscrowStatus.PARTIALLY_RELEASED]: {
        color: "warning",
        label: t("escrow.status.partiallyReleased") || "Partially Released",
      },
      [EscrowStatus.DISPUTED]: {
        color: "default",
        label: t("escrow.status.disputed") || "Disputed",
      },
    };

    const config = statusConfig[status] || { color: "default", label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const escrowColumns = [
    {
      title: t("escrow.table.bookingId") || "Booking ID",
      dataIndex: "booking_id",
      key: "booking_id",
      render: (bookingId: string | { _id: string }) => {
        const id = typeof bookingId === "string" ? bookingId : bookingId._id;
        return <Text copyable={{ text: id }}>{id.slice(-8)}</Text>;
      },
    },
    {
      title: t("escrow.table.amount") || "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: Escrow) => {
        return formatCurrency(amount, record.currency);
      },
    },
    {
      title: t("escrow.table.workerPayout") || "Worker Payout",
      dataIndex: "worker_payout",
      key: "worker_payout",
      render: (payout: number, record: Escrow) => {
        return formatCurrency(payout, record.currency);
      },
    },
    {
      title: t("escrow.table.status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status: EscrowStatus) => getStatusTag(status),
    },
    {
      title: t("escrow.table.heldAt") || "Held At",
      dataIndex: "held_at",
      key: "held_at",
      render: (date: string) => {
        return new Date(date).toLocaleString();
      },
    },
    {
      title: t("escrow.table.releasedAt") || "Released At",
      dataIndex: "released_at",
      key: "released_at",
      render: (date: string | null) => {
        return date ? new Date(date).toLocaleString() : "-";
      },
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
          <Title
            level={2}
            style={{ marginBottom: 24, color: "var(--ant-color-primary)" }}
          >
            {t("worker.wallet.title") || "Worker Wallet"}
          </Title>

          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="large"
            style={{ marginBottom: 24 }}
          >
            <Tabs.TabPane
              tab={
                <span>
                  <WalletOutlined />
                  {t("worker.wallet.tabs.balance") || "Balance"}
                </span>
              }
              key={WorkerWalletTabKey.BALANCE}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} md={8}>
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
                        {t("worker.wallet.cards.balance") || "Balance"}
                      </Text>
                      <Title
                        level={3}
                        style={{
                          margin: 0,
                          color: "var(--ant-color-primary)",
                          fontWeight: "bold",
                        }}
                      >
                        {formatCurrency(FAKE_BALANCE)}
                      </Title>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
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
                        {t("worker.wallet.cards.reconciliationBalance") ||
                          "Reconciliation Balance"}
                      </Text>
                      <Title
                        level={3}
                        style={{
                          margin: 0,
                          color: "var(--ant-color-primary)",
                          fontWeight: "bold",
                        }}
                      >
                        {formatCurrency(FAKE_RECONCILIATION_BALANCE)}
                      </Title>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
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
                        {t("worker.wallet.cards.pendingWithdrawal") ||
                          "Pending Withdrawal"}
                      </Text>
                      <Title
                        level={3}
                        style={{
                          margin: 0,
                          color: "var(--ant-color-primary)",
                          fontWeight: "bold",
                        }}
                      >
                        {formatCurrency(FAKE_PENDING_WITHDRAWAL)}
                      </Title>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={
                <span>
                  <TransactionOutlined />
                  {t("worker.wallet.tabs.reconciliation") ||
                    "Reconciliation Transactions"}
                </span>
              }
              key={WorkerWalletTabKey.RECONCILIATION}
            >
              <Card>
                <QueryState
                  isLoading={isLoadingEscrows}
                  isError={isEscrowError}
                  error={escrowError}
                  data={escrowData}
                  loadingText={t("common.loading") || "Loading..."}
                  errorTitle={t("common.error.title") || "Error"}
                  errorMessage={
                    escrowError?.response?.data?.message ||
                    t("common.error.message") ||
                    "Failed to load data"
                  }
                >
                  {escrowData && (
                    <Table<Escrow>
                      columns={escrowColumns}
                      dataSource={escrowData.data || []}
                      loading={isLoadingEscrows}
                      rowKey={(record) => record._id}
                      pagination={{
                        current: page,
                        pageSize: limit,
                        total: escrowData.pagination?.total || 0,
                        showSizeChanger: true,
                        showTotal: (total) =>
                          t("common.pagination.total", { total }),
                        pageSizeOptions: PAGE_SIZE_OPTIONS,
                      }}
                      onChange={(pagination) => {
                        handleTableChange(
                          pagination.current || PAGINATION_DEFAULTS.PAGE,
                          pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
                        );
                      }}
                      scroll={{ x: "max-content" }}
                    />
                  )}
                </QueryState>
              </Card>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}

export default function WorkerWalletPage() {
  return (
    <AuthGuard>
      <WorkerWalletContent />
    </AuthGuard>
  );
}
