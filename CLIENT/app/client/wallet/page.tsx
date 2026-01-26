"use client";

import { useState, useEffect, Fragment } from "react";
import {
  Layout,
  Card,
  Tabs,
  Row,
  Col,
  Typography,
  Table,
  Space,
  Spin,
  Button,
  Select,
  DatePicker,
} from "antd";
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  ReloadOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { walletApi } from "@/lib/api/wallet.api";
import type {
  WalletTransaction,
  TransactionHistoryQuery,
} from "@/lib/api/wallet.api";
import { TransactionType } from "@/lib/constants/wallet";
import { DateRangePreset } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { DepositModal } from "@/lib/components/deposit-modal";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { createWalletTransactionColumns } from "@/lib/utils/wallet.utils";
import { TransactionCardGrid } from "@/app/client/wallet/components/TransactionCardGrid";
import { getDateRangeFromPreset } from "@/lib/utils/date.utils";
import { Breakpoint, Spacing } from "@/lib/constants/ui.constants";

const { Title, Text } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

enum WalletTabKey {
  OVERVIEW = "overview",
  DEPOSIT_HISTORY = "deposit",
  WITHDRAW_HISTORY = "withdraw",
}



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
  const [depositDateRange, setDepositDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [depositDatePreset, setDepositDatePreset] = useState<DateRangePreset | null>(
    null
  );
  const [withdrawDateRange, setWithdrawDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [withdrawDatePreset, setWithdrawDatePreset] = useState<DateRangePreset | null>(
    null
  );
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

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: walletApi.getBalance,
    retry: false,
  });

  const depositQuery: TransactionHistoryQuery = {
    type: TransactionType.DEPOSIT,
    page: depositPage,
    limit: depositLimit,
    start_date: depositDateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: depositDateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const {
    data: depositHistory,
    isLoading: isLoadingDeposits,
    refetch: refetchDeposits,
  } = useQuery({
    queryKey: ["wallet-deposit-history", depositQuery],
    queryFn: () => walletApi.getTransactionHistory(depositQuery),
    retry: false,
  });

  const withdrawQuery: TransactionHistoryQuery = {
    type: TransactionType.WITHDRAW,
    page: withdrawPage,
    limit: withdrawLimit,
    start_date: withdrawDateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: withdrawDateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const {
    data: withdrawHistory,
    isLoading: isLoadingWithdraws,
    refetch: refetchWithdraws,
  } = useQuery({
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

  const handleDepositDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDepositDateRange(dates);
    setDepositDatePreset(null);
    setDepositPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleDepositDatePresetChange = (
    preset: DateRangePreset | null
  ): void => {
    setDepositDatePreset(preset);
    if (preset) {
      const [startDate, endDate] = getDateRangeFromPreset(preset);
      setDepositDateRange([startDate, endDate]);
    } else {
      setDepositDateRange(null);
    }
    setDepositPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleDepositResetFilters = (): void => {
    setDepositDateRange(null);
    setDepositDatePreset(null);
    setDepositPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleWithdrawDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setWithdrawDateRange(dates);
    setWithdrawDatePreset(null);
    setWithdrawPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleWithdrawDatePresetChange = (
    preset: DateRangePreset | null
  ): void => {
    setWithdrawDatePreset(preset);
    if (preset) {
      const [startDate, endDate] = getDateRangeFromPreset(preset);
      setWithdrawDateRange([startDate, endDate]);
    } else {
      setWithdrawDateRange(null);
    }
    setWithdrawPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleWithdrawResetFilters = (): void => {
    setWithdrawDateRange(null);
    setWithdrawDatePreset(null);
    setWithdrawPage(PAGINATION_DEFAULTS.PAGE);
  };

  const depositColumns = createWalletTransactionColumns(t, formatCurrency);
  const withdrawColumns = createWalletTransactionColumns(t, formatCurrency);

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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                    style={{ cursor: "pointer",padding: "24px" }}
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
                <Row gutter={[Spacing.MD, Spacing.MD]} style={{ marginBottom: Spacing.LG }}>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("wallet.filters.datePreset") || "Quick Date"}:</span>
                      <Select
                        style={{ width: "100%" }}
                        value={depositDatePreset}
                        onChange={handleDepositDatePresetChange}
                        allowClear
                        placeholder={t("wallet.filters.selectDatePreset") || "Select preset"}
                      >
                        <Option value={DateRangePreset.TODAY}>
                          {t("wallet.filters.today") || "Today"}
                        </Option>
                        <Option value={DateRangePreset.YESTERDAY}>
                          {t("wallet.filters.yesterday") || "Yesterday"}
                        </Option>
                        <Option value={DateRangePreset.LAST_7_DAYS}>
                          {t("wallet.filters.last7Days") || "Last 7 Days"}
                        </Option>
                        <Option value={DateRangePreset.LAST_14_DAYS}>
                          {t("wallet.filters.last14Days") || "Last 14 Days"}
                        </Option>
                        <Option value={DateRangePreset.THIS_MONTH}>
                          {t("wallet.filters.thisMonth") || "This Month"}
                        </Option>
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("wallet.filters.dateRange") || "Date Range"}:</span>
                      <RangePicker
                        style={{ width: "100%" }}
                        value={depositDateRange}
                        onChange={handleDepositDateRangeChange}
                        format={DATE_FORMAT_ISO}
                      />
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleDepositResetFilters}
                        style={{ width: "100%" }}
                      >
                        {t("common.reset") || "Reset"}
                      </Button>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchDeposits()}
                        loading={isLoadingDeposits}
                        style={{ width: "100%" }}
                      >
                        {t("common.refresh") || "Refresh"}
                      </Button>
                    </Space>
                  </Col>
                </Row>

                {isMobile ? (
                  <TransactionCardGrid
                    transactions={depositHistory?.data || []}
                    formatCurrency={formatCurrency}
                    t={t}
                    currentPage={depositPage}
                    pageSize={depositLimit}
                    total={depositHistory?.pagination?.total || 0}
                    onPageChange={handleDepositTableChange}
                    isLoading={isLoadingDeposits}
                  />
                ) : (
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
                )}
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
                <Row gutter={[Spacing.MD, Spacing.MD]} style={{ marginBottom: Spacing.LG }}>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("wallet.filters.datePreset") || "Quick Date"}:</span>
                      <Select
                        style={{ width: "100%" }}
                        value={withdrawDatePreset}
                        onChange={handleWithdrawDatePresetChange}
                        allowClear
                        placeholder={t("wallet.filters.selectDatePreset") || "Select preset"}
                      >
                        <Option value={DateRangePreset.TODAY}>
                          {t("wallet.filters.today") || "Today"}
                        </Option>
                        <Option value={DateRangePreset.YESTERDAY}>
                          {t("wallet.filters.yesterday") || "Yesterday"}
                        </Option>
                        <Option value={DateRangePreset.LAST_7_DAYS}>
                          {t("wallet.filters.last7Days") || "Last 7 Days"}
                        </Option>
                        <Option value={DateRangePreset.LAST_14_DAYS}>
                          {t("wallet.filters.last14Days") || "Last 14 Days"}
                        </Option>
                        <Option value={DateRangePreset.THIS_MONTH}>
                          {t("wallet.filters.thisMonth") || "This Month"}
                        </Option>
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span>{t("wallet.filters.dateRange") || "Date Range"}:</span>
                      <RangePicker
                        style={{ width: "100%" }}
                        value={withdrawDateRange}
                        onChange={handleWithdrawDateRangeChange}
                        format={DATE_FORMAT_ISO}
                      />
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleWithdrawResetFilters}
                        style={{ width: "100%" }}
                      >
                        {t("common.reset") || "Reset"}
                      </Button>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                      <span />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => refetchWithdraws()}
                        loading={isLoadingWithdraws}
                        style={{ width: "100%" }}
                      >
                        {t("common.refresh") || "Refresh"}
                      </Button>
                    </Space>
                  </Col>
                </Row>

                {isMobile ? (
                  <TransactionCardGrid
                    transactions={withdrawHistory?.data || []}
                    formatCurrency={formatCurrency}
                    t={t}
                    currentPage={withdrawPage}
                    pageSize={withdrawLimit}
                    total={withdrawHistory?.pagination?.total || 0}
                    onPageChange={handleWithdrawTableChange}
                    isLoading={isLoadingWithdraws}
                  />
                ) : (
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
                )}
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
