"use client";

import { useCallback } from "react";
import { Row, Col, Space, Empty, Pagination } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import { TransactionCard } from "./TransactionCard";
import { Spacing, GridColSpan } from "@/lib/constants/ui.constants";
import { PAGE_SIZE_OPTIONS } from "@/app/constants/constants";
import type { TFunction } from "i18next";
import styles from "@/app/client/wallet/components/TransactionCardGrid.module.scss";

type FormatCurrencyFunction = (amount: number) => string;

interface TransactionCardGridProps {
  transactions: WalletTransaction[];
  formatCurrency: FormatCurrencyFunction;
  t: TFunction;
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  isLoading?: boolean;
}

export function TransactionCardGrid({
  transactions,
  formatCurrency,
  t,
  currentPage,
  pageSize,
  total,
  onPageChange,
  isLoading = false,
}: TransactionCardGridProps) {
  const showTotal = useCallback(
    (totalCount: number) => t("common.pagination.total", { total: totalCount }),
    [t]
  );

  if (transactions.length === 0 && !isLoading) {
    return <Empty />;
  }

  return (
    <Space orientation="vertical" size="large" className={styles.space}>
      <Row gutter={[Spacing.MD, Spacing.MD]}>
        {transactions.map((transaction) => (
          <Col
            key={transaction.id}
            xs={GridColSpan.XS}
            sm={GridColSpan.SM}
            md={GridColSpan.MD}
            lg={GridColSpan.LG}
            xl={GridColSpan.XL}
          >
            <TransactionCard
              transaction={transaction}
              formatCurrency={formatCurrency}
              t={t}
            />
          </Col>
        ))}
      </Row>
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={total}
        showSizeChanger={true}
        showTotal={showTotal}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onChange={onPageChange}
        className={styles.pagination}
      />
    </Space>
  );
}
