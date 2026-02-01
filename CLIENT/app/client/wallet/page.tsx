"use client";

import { useState, useEffect } from "react";
import {
  Layout,
  Tabs,
  Typography,
  Space,
  Button,
} from "antd";
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { walletApi } from "@/lib/api/wallet.api";
import type {
  WalletTransaction,
  TransactionHistoryQuery,
} from "@/lib/api/wallet.api";
import { escrowApi } from "@/lib/api/escrow.api";
import type { Escrow, EscrowQuery } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
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
import {
  createWalletTransactionColumns,
  createEscrowColumns,
} from "@/app/client/wallet/constants";
import { getDateRangeFromPreset } from "@/lib/utils/date.utils";
import { Breakpoint } from "@/lib/constants/ui.constants";
import { WalletOverviewTab } from "@/app/client/wallet/components/WalletOverviewTab";
import styles from "@/app/client/wallet/page.module.scss";
import { WalletHistoryTab } from "@/app/client/wallet/components/WalletHistoryTab";
import { EscrowHistoryTab } from "@/app/client/wallet/components/EscrowHistoryTab";

const { Title } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

enum WalletTabKey {
  OVERVIEW = "overview",
  DEPOSIT_HISTORY = "deposit",
  WITHDRAW_HISTORY = "withdraw",
  ESCROW_HISTORY = "escrow-history",
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
  const [escrowPage, setEscrowPage] = useState<number>(
    PAGINATION_DEFAULTS.PAGE
  );
  const [escrowLimit, setEscrowLimit] = useState<number>(
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
  const [escrowDateRange, setEscrowDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [escrowDatePreset, setEscrowDatePreset] = useState<DateRangePreset | null>(
    null
  );
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus | null>(null);
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

  const createTransactionHistoryQuery = (
    type: TransactionType,
    page: number,
    limit: number,
    dateRange: [Dayjs | null, Dayjs | null] | null
  ): TransactionHistoryQuery => {
    if (!dateRange) {
      return {
        type,
        page,
        limit,
      };
    }
    const startDate = dateRange[0];
    const endDate = dateRange[1];
    if (startDate && endDate) {
      return {
        type,
        page,
        limit,
        start_date: startDate.format(DATE_FORMAT_ISO),
        end_date: endDate.format(DATE_FORMAT_ISO),
      };
    }
    return {
      type,
      page,
      limit,
    };
  };

  const depositQuery: TransactionHistoryQuery = createTransactionHistoryQuery(
    TransactionType.DEPOSIT,
    depositPage,
    depositLimit,
    depositDateRange
  );

  const {
    data: depositHistory,
    isLoading: isLoadingDeposits,
    refetch: refetchDeposits,
  } = useQuery({
    queryKey: ["wallet-deposit-history", depositQuery],
    queryFn: () => walletApi.getTransactionHistory(depositQuery),
    retry: false,
  });

  const withdrawQuery: TransactionHistoryQuery = createTransactionHistoryQuery(
    TransactionType.WITHDRAW,
    withdrawPage,
    withdrawLimit,
    withdrawDateRange
  );

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

  const handleEscrowTableChange = (page: number, pageSize: number): void => {
    setEscrowPage(page);
    setEscrowLimit(pageSize);
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

  const handleEscrowDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setEscrowDateRange(dates);
    setEscrowDatePreset(null);
    setEscrowPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleEscrowDatePresetChange = (
    preset: DateRangePreset | null
  ): void => {
    setEscrowDatePreset(preset);
    if (preset) {
      const [startDate, endDate] = getDateRangeFromPreset(preset);
      setEscrowDateRange([startDate, endDate]);
    } else {
      setEscrowDateRange(null);
    }
    setEscrowPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleEscrowStatusChange = (value: EscrowStatus | null): void => {
    setEscrowStatus(value);
    setEscrowPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleEscrowResetFilters = (): void => {
    setEscrowDateRange(null);
    setEscrowDatePreset(null);
    setEscrowStatus(null);
    setEscrowPage(PAGINATION_DEFAULTS.PAGE);
  };

  const depositColumns = createWalletTransactionColumns(t, formatCurrency);
  const withdrawColumns = createWalletTransactionColumns(t, formatCurrency);
  const escrowColumns = createEscrowColumns(t, formatCurrency);

  const escrowStatusOptions: EscrowStatus[] = [
    EscrowStatus.HOLDING,
    EscrowStatus.RELEASED,
    EscrowStatus.REFUNDED,
    EscrowStatus.PARTIALLY_RELEASED,
    EscrowStatus.DISPUTED,
  ];

  const createEscrowQuery = (
    page: number,
    limit: number,
    status: EscrowStatus | null,
    dateRange: [Dayjs | null, Dayjs | null] | null
  ): EscrowQuery => {
    const query: EscrowQuery = {
      page,
      limit,
    };
    if (status) {
      query.status = status;
    }
    if (dateRange) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      if (startDate && endDate) {
        query.start_date = startDate.format(DATE_FORMAT_ISO);
        query.end_date = endDate.format(DATE_FORMAT_ISO);
      }
    }
    return query;
  };

  const escrowQuery: EscrowQuery = createEscrowQuery(
    escrowPage,
    escrowLimit,
    escrowStatus,
    escrowDateRange
  );

  const {
    data: escrowHistory,
    isLoading: isLoadingEscrows,
    refetch: refetchEscrows,
  } = useQuery({
    queryKey: ["escrow-history-client", escrowQuery],
    queryFn: () => escrowApi.getMyEscrows(escrowQuery),
    retry: false,
  });

  const totalBalance = balanceData?.balance || 0;

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>
        <div className={styles.container}>
          <Space className={styles.headerSpace}>
            <Title level={2} className={styles.title}>
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
            className={styles.tabs}
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
              <WalletOverviewTab
                t={t}
                formatCurrency={formatCurrency}
                balance={totalBalance}
                isLoadingBalance={isLoadingBalance}
              />
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
              <WalletHistoryTab
                t={t}
                formatCurrency={formatCurrency}
                isMobile={isMobile}
                transactions={depositHistory?.data || []}
                columns={depositColumns}
                currentPage={depositPage}
                pageSize={depositLimit}
                total={depositHistory?.pagination?.total || 0}
                dateRange={depositDateRange}
                datePreset={depositDatePreset}
                isLoading={isLoadingDeposits}
                onDateRangeChange={handleDepositDateRangeChange}
                onDatePresetChange={handleDepositDatePresetChange}
                onResetFilters={handleDepositResetFilters}
                onPageChange={handleDepositTableChange}
                onRefresh={refetchDeposits}
              />
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
              <WalletHistoryTab
                t={t}
                formatCurrency={formatCurrency}
                isMobile={isMobile}
                transactions={withdrawHistory?.data || []}
                columns={withdrawColumns}
                currentPage={withdrawPage}
                pageSize={withdrawLimit}
                total={withdrawHistory?.pagination?.total || 0}
                dateRange={withdrawDateRange}
                datePreset={withdrawDatePreset}
                isLoading={isLoadingWithdraws}
                onDateRangeChange={handleWithdrawDateRangeChange}
                onDatePresetChange={handleWithdrawDatePresetChange}
                onResetFilters={handleWithdrawResetFilters}
                onPageChange={handleWithdrawTableChange}
                onRefresh={refetchWithdraws}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <WalletOutlined />
                  {t("wallet.tabs.escrowHistory")}
                </span>
              }
              key={WalletTabKey.ESCROW_HISTORY}
            >
              <EscrowHistoryTab
                t={t}
                formatCurrency={formatCurrency}
                isMobile={isMobile}
                isLoading={isLoadingEscrows}
                escrows={escrowHistory?.data || []}
                columns={escrowColumns}
                currentPage={escrowPage}
                pageSize={escrowLimit}
                total={escrowHistory?.pagination.total || 0}
                dateRange={escrowDateRange}
                datePreset={escrowDatePreset}
                status={escrowStatus}
                statusOptions={escrowStatusOptions}
                onDateRangeChange={handleEscrowDateRangeChange}
                onDatePresetChange={handleEscrowDatePresetChange}
                onStatusChange={handleEscrowStatusChange}
                onResetFilters={handleEscrowResetFilters}
                onPageChange={handleEscrowTableChange}
                onRefresh={refetchEscrows}
              />
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
