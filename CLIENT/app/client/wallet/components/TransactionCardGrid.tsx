"use client";

import { Row, Col, Space, Empty, Pagination } from "antd";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import { TransactionCard } from "./TransactionCard";
import { Spacing, GridColSpan } from "@/lib/constants/ui.constants";
import { PAGINATION_DEFAULTS, PAGE_SIZE_OPTIONS } from "@/app/constants/constants";
import type { TFunction } from "i18next";

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
}: TransactionCardGridProps): React.ReactElement {
  if (transactions.length === 0 && !isLoading) {
    return <Empty />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
        showTotal={(total) => t("common.pagination.total", { total })}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onChange={(newPage, newPageSize) => {
          onPageChange(newPage, newPageSize);
        }}
        style={{ marginTop: Spacing.LG, textAlign: "center" }}
      />
    </Space>
  );
}
