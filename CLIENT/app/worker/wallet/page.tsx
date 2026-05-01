"use client";

import React, { useState, useEffect, Fragment, useMemo, useCallback } from "react";
import {
  Card,
  Tabs,
  Row,
  Col,
  Typography,
  Table,
  Space,
  Select,
  DatePicker,
  Button,
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
import { walletApi } from "@/lib/api/wallet.api";
import type { WalletBalanceResponse } from "@/lib/api/wallet.api";
import type { Escrow, EscrowQuery, EscrowListResponse } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { QueryState } from "@/lib/components/query-state";
import { Spacing } from "@/lib/constants/ui.constants";
import { EscrowCardGrid } from "@/app/worker/wallet/components/EscrowCardGrid";
import { DateRangePreset } from "@/lib/constants/wallet";
import { getDateRangeFromPreset } from "@/lib/utils/date.utils";
import { useMobile } from "@/lib/hooks/use-mobile";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import {
  ESCROW_STATUS_OPTIONS,
  FilterValueAll,
  WORKER_WALLET_DATE_PRESET_OPTIONS,
  WorkerWalletTabKey,
} from "./constants/wallet-page.constants";
import { buildEscrowColumns } from "./constants/escrow-table-columns";
import styles from "./page.module.scss";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

function WorkerWalletContent() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const isMobile = useMobile();
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

  const escrowQuery: EscrowQuery = {
    page,
    limit,
    status: statusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useQuery<WalletBalanceResponse, AxiosError<ApiResponse>>({
    queryKey: ["worker-wallet-balance"],
    queryFn: () => walletApi.getBalance(),
    retry: false,
  });

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

  const handleTabChange = useCallback((key: string): void => {
    setActiveTab(key as WorkerWalletTabKey);
  }, []);

  const handleTableChange = useCallback((newPage: number, newPageSize: number): void => {
    setPage(newPage);
    setLimit(newPageSize);
  }, []);

  const handleStatusFilterChange = useCallback((
    value: EscrowStatus | FilterValueAll.ALL
  ): void => {
    setStatusFilter(value === FilterValueAll.ALL ? undefined : value);
    setPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const handleDateRangeChange = useCallback((
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDateRange(dates);
    setDatePreset(null);
    setPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const handleDatePresetChange = useCallback((preset: DateRangePreset | null): void => {
    setDatePreset(preset);
    if (preset) {
      const [startDate, endDate] = getDateRangeFromPreset(preset);
      setDateRange([startDate, endDate]);
    } else {
      setDateRange(null);
    }
    setPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const handleResetFilters = useCallback((): void => {
    setStatusFilter(undefined);
    setDateRange(null);
    setDatePreset(null);
    setPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const handleRefresh = useCallback(async (): Promise<void> => {
    await refetchEscrows();
  }, [refetchEscrows]);

  const escrowColumns = useMemo(
    () => buildEscrowColumns(t, formatCurrency),
    [t, formatCurrency]
  );

  useEffect(() => {
    if (balanceError) {
      handleError(balanceError);
    }
  }, [balanceError, handleError]);

  useEffect(() => {
    if (escrowError) {
      handleError(escrowError);
    }
  }, [escrowError, handleError]);

  return (
    <div className={styles.container} >
          <Title level={2} className={styles.pageTitle}>
            {t("worker.wallet.title") || "Worker Wallet"}
          </Title>

          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="large"
            className={styles.tabs}
          >
            <Tabs.TabPane
              tab={
                <Text>
                  <WalletOutlined />
                  {t("worker.wallet.tabs.balance") || "Balance"}
                </Text>
              }
              key={WorkerWalletTabKey.BALANCE}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} md={8}>
                  <Card hoverable className={styles.balanceCard}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text type="secondary">
                        {t("worker.wallet.cards.balance") || "Balance"}
                      </Text>
                      <Spin spinning={isLoadingBalance}>
                        <Title level={3} className={styles.cardTitle}>
                          {formatCurrency(balanceData?.balance ?? 0)}
                        </Title>
                      </Spin>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card hoverable className={styles.balanceCard}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text type="secondary">
                        {t("worker.wallet.cards.reconciliationBalance") ||
                          "Reconciliation Balance"}
                      </Text>
                      <Spin spinning={isLoadingBalance}>
                        <Title level={3} className={styles.cardTitle}>
                          {formatCurrency(balanceData?.balance ?? 0)}
                        </Title>
                      </Spin>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card hoverable className={styles.balanceCard}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text type="secondary">
                        {t("worker.wallet.cards.pendingWithdrawal") ||
                          "Pending Withdrawal"}
                      </Text>
                      <Spin spinning={isLoadingBalance}>
                        <Title level={3} className={styles.cardTitle}>
                          {formatCurrency(0)}
                        </Title>
                      </Spin>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={
                <Text>
                  <TransactionOutlined />
                  {t("worker.wallet.tabs.reconciliation") ||
                    "Reconciliation Transactions"}
                </Text>
              }
              key={WorkerWalletTabKey.RECONCILIATION}
            >
              <Card>
                <Row gutter={[Spacing.MD, Spacing.MD]} className={styles.filtersRow}>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text>{t("escrow.table.status")}:</Text>
                      <Select
                        className={styles.selectFull}
                        value={statusFilter || FilterValueAll.ALL}
                        onChange={handleStatusFilterChange}
                        allowClear
                      >
                        <Option value={FilterValueAll.ALL}>
                          {t("booking.list.filters.all") || "All"}
                        </Option>
                        {ESCROW_STATUS_OPTIONS.map((status) => (
                          <Option key={status} value={status}>
                            {t(`escrow.status.${status}`) || status}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text>{t("worker.wallet.filters.datePreset") || "Quick Date"}:</Text>
                      <Select
                        className={styles.selectFull}
                        value={datePreset}
                        onChange={handleDatePresetChange}
                        allowClear
                        placeholder={t("worker.wallet.filters.selectDatePreset") || "Select preset"}
                      >
                        {WORKER_WALLET_DATE_PRESET_OPTIONS.map((presetOption) => (
                          <Option key={presetOption.value} value={presetOption.value}>
                            {t(presetOption.labelKey)}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text>{t("booking.list.filters.dateRange") || "Date Range"}:</Text>
                      <RangePicker
                        className={styles.selectFull}
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        format={DATE_FORMAT_ISO}
                      />
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text />
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleResetFilters}
                        className={styles.buttonFull}
                      >
                        {t("common.reset") || "Reset"}
                      </Button>
                    </Space>
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <Space orientation="vertical" size="small" className={styles.spaceFull}>
                      <Text />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={isLoadingEscrows}
                        className={styles.buttonFull}
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
                  {escrowData ? (
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
                  ) : null}
                </QueryState>
              </Card>
            </Tabs.TabPane>
          </Tabs>
    </div>
  );
}

export default function WorkerWalletPage() {
  return (
    <AuthGuard>
      <WorkerWalletContent />
    </AuthGuard>
  );
}
