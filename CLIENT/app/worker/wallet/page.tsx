"use client";

import React, { useState, useEffect, Fragment } from "react";
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
  Select,
  DatePicker,
  Button,
  Pagination,
  Empty,
  Spin,
} from "antd";
import {
  WalletOutlined,
  TransactionOutlined,
  ReloadOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { AxiosError } from "axios";
import type { ApiResponse } from "@/lib/axios/config";
import { escrowApi } from "@/lib/api/escrow.api";
import type { Escrow, EscrowQuery, EscrowListResponse } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { QueryState } from "@/lib/components/query-state";
import { Breakpoint, Spacing } from "@/lib/constants/ui.constants";
import { EscrowCardGrid } from "@/app/worker/wallet/components/EscrowCardGrid";
import { DateRangePreset } from "@/lib/constants/wallet";
import { getDateRangeFromPreset } from "@/lib/utils/date.utils";

const { Title, Text } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

enum WorkerWalletTabKey {
  BALANCE = "balance",
  RECONCILIATION = "reconciliation",
}

enum FilterValueAll {
  ALL = "all",
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
  const [statusFilter, setStatusFilter] = useState<EscrowStatus | undefined>(
    undefined
  );
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = (): void => {
      setIsMobile(window.innerWidth < Breakpoint.MOBILE);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const escrowQuery: EscrowQuery = {
    page,
    limit,
    status: statusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const {
    data: escrowData,
    isLoading: isLoadingEscrows,
    isError: isEscrowError,
    error: escrowError,
    refetch: refetchEscrows,
  } = useQuery<EscrowListResponse, AxiosError<ApiResponse>>({
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

  const handleStatusFilterChange = (
    value: EscrowStatus | FilterValueAll.ALL
  ): void => {
    setStatusFilter(value === FilterValueAll.ALL ? undefined : value);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDateRange(dates);
    setDatePreset(null);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleDatePresetChange = (preset: DateRangePreset | null): void => {
    setDatePreset(preset);
    if (preset) {
      const [startDate, endDate] = getDateRangeFromPreset(preset);
      setDateRange([startDate, endDate]);
    } else {
      setDateRange(null);
    }
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleResetFilters = (): void => {
    setStatusFilter(undefined);
    setDateRange(null);
    setDatePreset(null);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleRefresh = async (): Promise<void> => {
    await refetchEscrows();
  };

  const getStatusTag = (status: EscrowStatus): React.ReactElement => {
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
      render: (amount: number) => {
        return formatCurrency(amount);
      },
    },
    {
      title: t("escrow.table.workerPayout") || "Worker Payout",
      dataIndex: "worker_payout",
      key: "worker_payout",
      render: (payout: number) => {
        return formatCurrency(payout);
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                <Row gutter={[Spacing.MD, Spacing.MD]} style={{ marginBottom: Spacing.LG }}>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("escrow.table.status")}:</span>
                      <Select
                        style={{ width: "100%" }}
                        value={statusFilter || FilterValueAll.ALL}
                        onChange={handleStatusFilterChange}
                        allowClear
                      >
                        <Option value={FilterValueAll.ALL}>
                          {t("booking.list.filters.all") || "All"}
                        </Option>
                        <Option value={EscrowStatus.HOLDING}>
                          {t(`escrow.status.${EscrowStatus.HOLDING}`) ||
                            EscrowStatus.HOLDING}
                        </Option>
                        <Option value={EscrowStatus.RELEASED}>
                          {t(`escrow.status.${EscrowStatus.RELEASED}`) ||
                            EscrowStatus.RELEASED}
                        </Option>
                        <Option value={EscrowStatus.REFUNDED}>
                          {t(`escrow.status.${EscrowStatus.REFUNDED}`) ||
                            EscrowStatus.REFUNDED}
                        </Option>
                        <Option value={EscrowStatus.PARTIALLY_RELEASED}>
                          {t(`escrow.status.${EscrowStatus.PARTIALLY_RELEASED}`) ||
                            EscrowStatus.PARTIALLY_RELEASED}
                        </Option>
                        <Option value={EscrowStatus.DISPUTED}>
                          {t(`escrow.status.${EscrowStatus.DISPUTED}`) ||
                            EscrowStatus.DISPUTED}
                        </Option>
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("worker.wallet.filters.datePreset") || "Quick Date"}:</span>
                      <Select
                        style={{ width: "100%" }}
                        value={datePreset}
                        onChange={handleDatePresetChange}
                        allowClear
                        placeholder={t("worker.wallet.filters.selectDatePreset") || "Select preset"}
                      >
                        <Option value={DateRangePreset.TODAY}>
                          {t("worker.wallet.filters.today") || "Today"}
                        </Option>
                        <Option value={DateRangePreset.YESTERDAY}>
                          {t("worker.wallet.filters.yesterday") || "Yesterday"}
                        </Option>
                        <Option value={DateRangePreset.LAST_7_DAYS}>
                          {t("worker.wallet.filters.last7Days") || "Last 7 Days"}
                        </Option>
                        <Option value={DateRangePreset.LAST_14_DAYS}>
                          {t("worker.wallet.filters.last14Days") || "Last 14 Days"}
                        </Option>
                        <Option value={DateRangePreset.THIS_MONTH}>
                          {t("worker.wallet.filters.thisMonth") || "This Month"}
                        </Option>
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("booking.list.filters.dateRange") || "Date Range"}:</span>
                      <RangePicker
                        style={{ width: "100%" }}
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        format={DATE_FORMAT_ISO}
                      />
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleResetFilters}
                        style={{ width: "100%" }}
                      >
                        {t("common.reset") || "Reset"}
                      </Button>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={isLoadingEscrows}
                        style={{ width: "100%" }}
                      >
                        {t("common.refresh") || "Refresh"}
                      </Button>
                    </Space>
                  </Col>
                </Row>

                <QueryState
                  isLoading={isLoadingEscrows}
                  isError={isEscrowError}
                  error={escrowError}
                  data={escrowData}
                  loadingText={t("common.loading") || "Loading..."}
                  errorTitle={t("common.error.title") || "Error"}
                  errorMessage={
                    (escrowError && "response" in escrowError
                      ? escrowError.response?.data?.message
                      : null) ||
                    t("common.error.message") ||
                    "Failed to load data"
                  }
                >
                  {escrowData && (
                    <Fragment>
                      {isMobile ? (
                        <EscrowCardGrid
                          escrows={escrowData.data || []}
                          formatCurrency={formatCurrency}
                          t={t}
                          currentPage={page}
                          pageSize={limit}
                          total={escrowData.pagination?.total || 0}
                          onPageChange={handleTableChange}
                          isLoading={isLoadingEscrows}
                        />
                      ) : (
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
                    </Fragment>
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
