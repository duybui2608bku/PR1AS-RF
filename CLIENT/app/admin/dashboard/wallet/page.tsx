"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Table,
  Card,
  Space,
  Typography,
  Select,
  Input,
  Button,
  Space as AntSpace,
  Row,
  Col,
  Statistic,
  Avatar,
  Tag,
  List,
  Spin,
  Tabs,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  BarChartOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { walletApi } from "@/lib/api/wallet.api";
import type {
  AdminTransactionHistoryQuery,
  WalletTransaction,
  AdminTransactionStatsResponse,
  TopUserTransaction,
  ChartDataPoint,
} from "@/lib/api/wallet.api";
import {
  TransactionType,
  TransactionStatus,
  DateRangePreset,
} from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import {
  PAGE_SIZE_OPTIONS,
  PAGINATION_DEFAULTS,
} from "@/app/constants/constants";
import {
  DATE_RANGE_OPTIONS,
  CHART_COLORS,
  TabKey,
} from "@/app/admin/dashboard/wallet/constants/wallet.constants";
import { buildWalletColumns } from "./constants/wallet-table-columns";
import styles from "./page.module.scss";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const { Title, Text } = Typography;
const { Option } = Select;

interface StatCardsProps {
  stats: AdminTransactionStatsResponse;
  formatCurrency: (amount: number, currency: string) => string;
  t: ReturnType<typeof useI18n>["t"];
}

const StatCards = memo(function StatCards({ stats, formatCurrency, t }: StatCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.totalTransactions")}
            value={stats.total_transactions}
            prefix={<SwapOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.deposit")}
            value={stats.deposit.count}
            suffix={
              <Text type="secondary" className={styles.statSuffix}>
                ({formatCurrency(stats.deposit.total_amount, "VND")})
              </Text>
            }
            prefix={<ArrowDownOutlined className={styles.statDeposit} />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.withdraw")}
            value={stats.withdraw.count}
            suffix={
              <Text type="secondary" className={styles.statSuffix}>
                ({formatCurrency(stats.withdraw.total_amount, "VND")})
              </Text>
            }
            prefix={<ArrowUpOutlined className={styles.statWithdraw} />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.payment")}
            value={stats.payment.count}
            suffix={
              <Text type="secondary" className={styles.statSuffix}>
                ({formatCurrency(stats.payment.total_amount, "VND")})
              </Text>
            }
            prefix={<DollarOutlined className={styles.statPayment} />}
            valueStyle={{ color: "#1677ff" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.refund")}
            value={stats.refund.count}
            suffix={
              <Text type="secondary" className={styles.statSuffix}>
                ({formatCurrency(stats.refund.total_amount, "VND")})
              </Text>
            }
            prefix={<DollarOutlined className={styles.statRefund} />}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.success")}
            value={stats.success.count}
            prefix={<CheckCircleOutlined className={styles.statSuccess} />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.pending")}
            value={stats.pending.count}
            prefix={<ClockCircleOutlined className={styles.statPending} />}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          <Statistic
            title={t("admin.wallet.stats.failed")}
            value={stats.failed.count}
            prefix={<CloseCircleOutlined className={styles.statFailed} />}
            valueStyle={{ color: "#ff4d4f" }}
          />
        </Card>
      </Col>
    </Row>
  );
});

interface TopUsersListProps {
  users: TopUserTransaction[];
  formatCurrency: (amount: number, currency: string) => string;
  t: ReturnType<typeof useI18n>["t"];
}

const TopUsersList = memo(function TopUsersList({ users, formatCurrency, t }: TopUsersListProps) {
  return (
    <List
      itemLayout="horizontal"
      dataSource={users}
      renderItem={(item: TopUserTransaction, index: number) => (
        <List.Item>
          <List.Item.Meta
            avatar={
              <Avatar
                size={40}
                src={item.avatar}
                icon={!item.avatar ? <UserOutlined /> : undefined}
              />
            }
            title={
              <Space>
                <Tag color="blue">#{index + 1}</Tag>
                <Text strong>{item.full_name}</Text>
              </Space>
            }
            description={item.email}
          />
          <div className={styles.topUserAmount}>
            <div>
              <Text strong>{item.transaction_count}</Text>{" "}
              <Text type="secondary">
                {t("admin.wallet.topUsers.transactions")}
              </Text>
            </div>
            <div>
              <Text type="success">{formatCurrency(item.total_amount, "VND")}</Text>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
});

export default function AdminWalletPage() {
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);

  const [activeTab, setActiveTab] = useState<TabKey>(TabKey.STATISTICS);
  const [dateRange, setDateRange] = useState<DateRangePreset>(
    DateRangePreset.LAST_7_DAYS
  );
  const [filters, setFilters] = useState<AdminTransactionHistoryQuery>({
    page: PAGINATION_DEFAULTS.PAGE,
    limit: PAGINATION_DEFAULTS.LIMIT,
  });
  const [userIdFilter, setUserIdFilter] = useState<string>("");

  const {
    data: transactionData,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
    error: transactionError,
  } = useQuery({
    queryKey: ["admin-transaction-history", filters],
    queryFn: () => walletApi.getAdminTransactionHistory(filters),
    enabled: activeTab === TabKey.DATA,
  });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-wallet-stats", dateRange],
    queryFn: () => walletApi.getTransactionStats({ date_range: dateRange }),
    enabled: activeTab === TabKey.STATISTICS,
  });

  const {
    data: topUsersData,
    isLoading: isLoadingTopUsers,
    error: topUsersError,
    refetch: refetchTopUsers,
  } = useQuery({
    queryKey: ["admin-wallet-top-users", dateRange],
    queryFn: () => walletApi.getTopUsers({ date_range: dateRange }),
    enabled: activeTab === TabKey.STATISTICS,
  });

  const {
    data: chartData,
    isLoading: isLoadingChart,
    error: chartError,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ["admin-wallet-chart", dateRange],
    queryFn: () => walletApi.getTransactionChartData({ date_range: dateRange }),
    enabled: activeTab === TabKey.STATISTICS,
  });

  useEffect(() => {
    if (transactionError) handleError(transactionError);
    if (statsError) handleError(statsError);
    if (topUsersError) handleError(topUsersError);
    if (chartError) handleError(chartError);
  }, [transactionError, statsError, topUsersError, chartError, handleError]);

  const handleTabChange = useCallback((key: string): void => {
    setActiveTab(key as TabKey);
  }, []);

  const handleDateRangeChange = useCallback((value: DateRangePreset): void => {
    setDateRange(value);
  }, []);

  const handleRefreshStats = useCallback((): void => {
    refetchStats();
    refetchTopUsers();
    refetchChart();
  }, [refetchStats, refetchTopUsers, refetchChart]);

  const handleFilterChange = useCallback((
    key: keyof AdminTransactionHistoryQuery,
    value: string | number | undefined
  ): void => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, page: PAGINATION_DEFAULTS.PAGE };
      if (value === undefined || value === null || value === "") {
        const { [key]: _, ...rest } = updatedFilters;
        return rest as AdminTransactionHistoryQuery;
      }
      return { ...updatedFilters, [key]: value };
    });
  }, []);

  const handleUserIdFilterChange = useCallback((value: string): void => {
    setUserIdFilter(value);
  }, []);

  const handleSearch = useCallback((): void => {
    setFilters((prev) => ({
      ...prev,
      user_id: userIdFilter.trim() || undefined,
      page: PAGINATION_DEFAULTS.PAGE,
    }));
  }, [userIdFilter]);

  const handleClearFilters = useCallback((): void => {
    setUserIdFilter("");
    setFilters({
      page: PAGINATION_DEFAULTS.PAGE,
      limit: PAGINATION_DEFAULTS.LIMIT,
    });
  }, []);

  const handleTableChange = useCallback((page: number, pageSize: number): void => {
    setFilters((prev) => ({
      ...prev,
      page,
      limit: pageSize,
    }));
  }, []);

  const handleUserIdInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleUserIdFilterChange(e.target.value);
  }, [handleUserIdFilterChange]);

  const handleTypeFilterChange = useCallback((value: string) => {
    handleFilterChange("type", value || undefined);
  }, [handleFilterChange]);

  const handleStatusFilterChange = useCallback((value: string) => {
    handleFilterChange("status", value || undefined);
  }, [handleFilterChange]);

  const handlePaginationChange = useCallback((pagination: { current?: number; pageSize?: number }) => {
    handleTableChange(
      pagination.current || PAGINATION_DEFAULTS.PAGE,
      pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
    );
  }, [handleTableChange]);

  const chartConfig = useMemo(() => {
    if (!chartData?.data) return null;

    return {
      labels: chartData.data.map((item: ChartDataPoint) => item.date),
      datasets: [
        {
          label: t("wallet.transactionType.deposit"),
          data: chartData.data.map((item: ChartDataPoint) => item.deposit),
          borderColor: CHART_COLORS.deposit,
          backgroundColor: CHART_COLORS.depositBg,
          fill: true,
          tension: 0.4,
        },
        {
          label: t("wallet.transactionType.withdraw"),
          data: chartData.data.map((item: ChartDataPoint) => item.withdraw),
          borderColor: CHART_COLORS.withdraw,
          backgroundColor: CHART_COLORS.withdrawBg,
          fill: true,
          tension: 0.4,
        },
        {
          label: t("wallet.transactionType.payment"),
          data: chartData.data.map((item: ChartDataPoint) => item.payment),
          borderColor: CHART_COLORS.payment,
          backgroundColor: CHART_COLORS.paymentBg,
          fill: true,
          tension: 0.4,
        },
        {
          label: t("wallet.transactionType.refund"),
          data: chartData.data.map((item: ChartDataPoint) => item.refund),
          borderColor: CHART_COLORS.refund,
          backgroundColor: CHART_COLORS.refundBg,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [chartData, t]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"line">) => {
              const label = context.dataset.label || "";
              const value = context.parsed.y ?? 0;
              return `${label}: ${formatCurrency(value, "VND")}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: number | string) => formatCurrency(Number(value), "VND"),
          },
        },
      },
    }),
    [formatCurrency]
  );

  const columns = useMemo(() => buildWalletColumns({ t, formatCurrency }), [t, formatCurrency]);

  const tabItems = useMemo(() => [
    {
      key: TabKey.STATISTICS,
      label: (
        <span>
          <BarChartOutlined />
          {t("admin.wallet.tabs.statistics")}
        </span>
      ),
      children: (
        <Space orientation="vertical" size="large" className={styles.spaceFull}>
          <div className={styles.toolbarRow}>
            <Select
              value={dateRange}
              onChange={handleDateRangeChange}
              className={styles.selectWidth}
              size="large"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefreshStats}
              loading={isLoadingStats || isLoadingTopUsers || isLoadingChart}
              size="large"
            >
              {t("common.refresh")}
            </Button>
          </div>

          {isLoadingStats ? (
            <Card>
              <div className={styles.spinWrapper}>
                <Spin size="large" />
              </div>
            </Card>
          ) : statsData ? (
            <StatCards stats={statsData} formatCurrency={formatCurrency} t={t} />
          ) : null}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title={t("admin.wallet.chart.title")}>
                {isLoadingChart ? (
                  <div className={styles.spinWrapper}>
                    <Spin size="large" />
                  </div>
                ) : chartConfig ? (
                  <div className={styles.chartHeight}>
                    <Line data={chartConfig} options={chartOptions} />
                  </div>
                ) : (
                  <div className={styles.spinWrapper}>
                    <Text type="secondary">{t("common.noData")}</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title={t("admin.wallet.topUsers.title")}>
                {isLoadingTopUsers ? (
                  <div className={styles.spinWrapper}>
                    <Spin size="large" />
                  </div>
                ) : topUsersData?.users && topUsersData.users.length > 0 ? (
                  <TopUsersList users={topUsersData.users} formatCurrency={formatCurrency} t={t} />
                ) : (
                  <div className={styles.spinWrapper}>
                    <Text type="secondary">{t("common.noData")}</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: TabKey.DATA,
      label: (
        <span>
          <TableOutlined />
          {t("admin.wallet.tabs.data")}
        </span>
      ),
      children: (
        <Space orientation="vertical" size="large" className={styles.spaceFull}>
          <Card>
            <AntSpace orientation="vertical" size="middle" className={styles.spaceFull}>
              <AntSpace wrap size={16}>
                <Input
                  placeholder={t("admin.wallet.filters.userId")}
                  value={userIdFilter}
                  size="large"
                  onChange={handleUserIdInputChange}
                  className={styles.filterInput}
                  allowClear
                />

                <Select
                  placeholder={t("admin.wallet.filters.type")}
                  value={filters.type}
                  onChange={handleTypeFilterChange}
                  className={styles.filterSelect}
                  allowClear
                  size="large"
                >
                  {Object.values(TransactionType).map((type) => (
                    <Option key={type} value={type}>
                      {t(`wallet.transactionType.${type}`)}
                    </Option>
                  ))}
                </Select>

                <Select
                  placeholder={t("admin.wallet.filters.status")}
                  value={filters.status}
                  size="large"
                  onChange={handleStatusFilterChange}
                  className={styles.filterSelect}
                  allowClear
                >
                  {Object.values(TransactionStatus).map((status) => (
                    <Option key={status} value={status}>
                      {t(`wallet.transactionStatus.${status}`)}
                    </Option>
                  ))}
                </Select>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  size="large"
                >
                  {t("common.search")}
                </Button>

                <Button
                  size="large"
                  icon={<ClearOutlined />}
                  onClick={handleClearFilters}
                >
                  {t("common.clear")}
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetchTransactions()}
                  loading={isLoadingTransactions}
                  size="large"
                >
                  {t("common.refresh")}
                </Button>
              </AntSpace>
            </AntSpace>
          </Card>

          <Card>
            <Table<WalletTransaction>
              columns={columns}
              dataSource={transactionData?.data || []}
              loading={isLoadingTransactions}
              rowKey={(record) => record.id}
              pagination={{
                current:
                  transactionData?.pagination?.page || PAGINATION_DEFAULTS.PAGE,
                pageSize:
                  transactionData?.pagination?.limit || PAGINATION_DEFAULTS.LIMIT,
                total: transactionData?.pagination?.total || 0,
                showSizeChanger: true,
                showTotal: (total) => t("common.pagination.total", { total }),
                pageSizeOptions: PAGE_SIZE_OPTIONS,
              }}
              onChange={handlePaginationChange}
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Space>
      ),
    },
  ], [
    t,
    dateRange,
    handleDateRangeChange,
    handleRefreshStats,
    isLoadingStats,
    isLoadingTopUsers,
    isLoadingChart,
    statsData,
    chartConfig,
    chartOptions,
    topUsersData,
    formatCurrency,
    userIdFilter,
    handleUserIdInputChange,
    filters.type,
    filters.status,
    handleTypeFilterChange,
    handleStatusFilterChange,
    handleSearch,
    handleClearFilters,
    refetchTransactions,
    isLoadingTransactions,
    transactionData,
    columns,
    handlePaginationChange,
  ]);

  return (
    <Space orientation="vertical" size="large" className={styles.spaceFull}>
      <Title level={2}>{t("admin.wallet.title")}</Title>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
      />
    </Space>
  );
}
