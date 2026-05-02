"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Typography,
  Space,
  Button,
} from "antd";
import {
  PlusOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { walletApi } from "@/lib/api/wallet.api";
import type {
  TransactionHistoryQuery,
} from "@/lib/api/wallet.api";
import { TransactionType } from "@/lib/constants/wallet";
import { DateRangePreset } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { DepositModal } from "@/lib/components/deposit-modal";
import {
  PAGINATION_DEFAULTS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import {
  createWalletTransactionColumns,
} from "@/app/client/wallet/constants";
import { getDateRangeFromPreset } from "@/lib/utils/date.utils";
import { useMobile } from "@/lib/hooks/use-mobile";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { WalletOverviewTab } from "@/app/client/wallet/components/WalletOverviewTab";
import styles from "@/app/client/wallet/page.module.scss";
import { WalletHistoryTab } from "@/app/client/wallet/components/WalletHistoryTab";

const { Title, Text } = Typography;

function WalletContent() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const isMobile = useMobile();
  const [depositPage, setDepositPage] = useState<number>(
    PAGINATION_DEFAULTS.PAGE
  );
  const [depositLimit, setDepositLimit] = useState<number>(
    PAGINATION_DEFAULTS.LIMIT
  );
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [depositDateRange, setDepositDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [depositDatePreset, setDepositDatePreset] = useState<DateRangePreset | null>(
    null
  );

  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: walletApi.getBalance,
    retry: false,
  });

  const buildTransactionHistoryQuery = useCallback((
    type: TransactionType,
    page: number,
    limit: number,
    dateRange: [Dayjs | null, Dayjs | null] | null
  ): TransactionHistoryQuery => {
    if (!dateRange) {
      return { type, page, limit };
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
    return { type, page, limit };
  }, []);

  const depositQuery: TransactionHistoryQuery = useMemo(
    () => buildTransactionHistoryQuery(TransactionType.DEPOSIT, depositPage, depositLimit, depositDateRange),
    [buildTransactionHistoryQuery, depositPage, depositLimit, depositDateRange]
  );

  const {
    data: depositHistory,
    isLoading: isLoadingDeposits,
    refetch: refetchDeposits,
    error: depositHistoryError,
  } = useQuery({
    queryKey: ["wallet-deposit-history", depositQuery],
    queryFn: () => walletApi.getTransactionHistory(depositQuery),
    retry: false,
  });

  const handleDepositTableChange = useCallback((page: number, pageSize: number): void => {
    setDepositPage(page);
    setDepositLimit(pageSize);
  }, []);

  const handleDepositDateRangeChange = useCallback((
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDepositDateRange(dates);
    setDepositDatePreset(null);
    setDepositPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const handleDepositDatePresetChange = useCallback((
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
  }, []);

  const handleDepositResetFilters = useCallback((): void => {
    setDepositDateRange(null);
    setDepositDatePreset(null);
    setDepositPage(PAGINATION_DEFAULTS.PAGE);
  }, []);

  const depositColumns = useMemo(
    () => createWalletTransactionColumns(t, formatCurrency),
    [t, formatCurrency]
  );

  const totalBalance = balanceData?.balance || 0;

  const handleOpenDepositModal = useCallback(() => {
    setDepositModalOpen(true);
  }, []);

  const handleCloseDepositModal = useCallback(() => {
    setDepositModalOpen(false);
  }, []);

  useEffect(() => {
    if (balanceError) {
      handleError(balanceError);
    }
  }, [balanceError, handleError]);

  useEffect(() => {
    if (depositHistoryError) {
      handleError(depositHistoryError);
    }
  }, [depositHistoryError, handleError]);

  return (
    <>
      <div className={styles.container}>
        <Space className={styles.headerSpace}>
          <Title level={2} className={styles.title}>
            {t("wallet.title")}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleOpenDepositModal}
          >
            {t("wallet.deposit.title")}
          </Button>
        </Space>

        <WalletOverviewTab
          t={t}
          formatCurrency={formatCurrency}
          balance={totalBalance}
          isLoadingBalance={isLoadingBalance}
        />

        <Space direction="vertical" size="middle" className={styles.tabs}>
          <Text strong>{t("wallet.tabs.depositHistory")}</Text>
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
        </Space>
      </div>
      <DepositModal
        open={depositModalOpen}
        onClose={handleCloseDepositModal}
      />
    </>
  );
}

export default function WalletPage() {
  return (
    <AuthGuard>
      <WalletContent />
    </AuthGuard>
  );
}
