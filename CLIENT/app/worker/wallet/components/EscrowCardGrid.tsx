"use client";

import { Row, Col, Space, Empty, Pagination } from "antd";
import type { Escrow } from "@/lib/types/escrow";
import { EscrowCard } from "./EscrowCard";
import { Spacing, GridColSpan } from "@/lib/constants/ui.constants";
import { PAGINATION_DEFAULTS, PAGE_SIZE_OPTIONS } from "@/app/constants/constants";
import type { TFunction } from "i18next";

type FormatCurrencyFunction = (amount: number) => string;

interface EscrowCardGridProps {
  escrows: Escrow[];
  formatCurrency: FormatCurrencyFunction;
  t: TFunction;
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  isLoading?: boolean;
}

export function EscrowCardGrid({
  escrows,
  formatCurrency,
  t,
  currentPage,
  pageSize,
  total,
  onPageChange,
  isLoading = false,
}: EscrowCardGridProps): React.ReactElement {
  if (escrows.length === 0 && !isLoading) {
    return <Empty />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row gutter={[Spacing.MD, Spacing.MD]}>
        {escrows.map((escrow) => (
          <Col
            key={escrow._id}
            xs={GridColSpan.XS}
            sm={GridColSpan.SM}
            md={GridColSpan.MD}
            lg={GridColSpan.LG}
            xl={GridColSpan.XL}
          >
            <EscrowCard
              escrow={escrow}
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
