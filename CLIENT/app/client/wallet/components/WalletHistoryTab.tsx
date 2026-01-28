"use client";

import {
  Card,
  Row,
  Col,
  Table,
  Space,
  Button,
  Select,
  DatePicker,
} from "antd";
import {
  ReloadOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { TFunction } from "i18next";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import { DateRangePreset } from "@/lib/constants/wallet";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { createWalletTransactionColumns } from "@/app/client/wallet/constants";
import { TransactionCardGrid } from "@/app/client/wallet/components/TransactionCardGrid";
import { Spacing } from "@/lib/constants/ui.constants";

const { Option } = Select;
const { RangePicker } = DatePicker;

type FormatCurrencyFunction = (amount: number) => string;

type WalletHistoryTabProps = {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  isMobile: boolean;
  transactions: WalletTransaction[];
  columns: ReturnType<typeof createWalletTransactionColumns>;
  currentPage: number;
  pageSize: number;
  total: number;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  datePreset: DateRangePreset | null;
  isLoading: boolean;
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onDatePresetChange: (preset: DateRangePreset | null) => void;
  onResetFilters: () => void;
  onPageChange: (page: number, pageSize: number) => void;
  onRefresh: () => void;
};

export function WalletHistoryTab({
  t,
  formatCurrency,
  isMobile,
  transactions,
  columns,
  currentPage,
  pageSize,
  total,
  dateRange,
  datePreset,
  isLoading,
  onDateRangeChange,
  onDatePresetChange,
  onResetFilters,
  onPageChange,
  onRefresh,
}: WalletHistoryTabProps) {
  return (
    <Card>
      <Row gutter={[Spacing.MD, Spacing.MD]} style={{ marginBottom: Spacing.LG }}>
        <Col xs={24} sm={12} md={6}>
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <span>{t("wallet.filters.datePreset") || "Quick Date"}:</span>
            <Select
              style={{ width: "100%" }}
              value={datePreset}
              onChange={onDatePresetChange}
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
              value={dateRange}
              onChange={onDateRangeChange}
              format={DATE_FORMAT_ISO}
            />
          </Space>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <span />
            <Button
              icon={<UndoOutlined />}
              onClick={onResetFilters}
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
              onClick={onRefresh}
              loading={isLoading}
              style={{ width: "100%" }}
            >
              {t("common.refresh") || "Refresh"}
            </Button>
          </Space>
        </Col>
      </Row>

      {isMobile ? (
        <TransactionCardGrid
          transactions={transactions}
          formatCurrency={formatCurrency}
          t={t}
          currentPage={currentPage}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      ) : (
        <Table<WalletTransaction>
          columns={columns}
          dataSource={transactions}
          loading={isLoading}
          rowKey={(record) => record.id}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) =>
              t("common.pagination.total", { total: value }),
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
          onChange={(pagination) => {
            onPageChange(
              pagination.current || PAGINATION_DEFAULTS.PAGE,
              pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
            );
          }}
          scroll={{ x: "max-content" }}
        />
      )}
    </Card>
  );
}
