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
import type { Escrow } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { DateRangePreset } from "@/lib/constants/wallet";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { createEscrowColumns } from "@/app/client/wallet/constants";
import { Spacing } from "@/lib/constants/ui.constants";
import { EscrowCardGrid } from "@/app/worker/wallet/components/EscrowCardGrid";
import styles from "@/app/client/wallet/components/EscrowHistoryTab.module.scss";

const { Option } = Select;
const { RangePicker } = DatePicker;

type FormatCurrencyFunction = (amount: number) => string;

type EscrowHistoryTabProps = {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  isLoading: boolean;
  escrows: Escrow[];
  columns: ReturnType<typeof createEscrowColumns>;
  isMobile: boolean;
  currentPage: number;
  pageSize: number;
  total: number;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  datePreset: DateRangePreset | null;
  status: EscrowStatus | null;
  statusOptions: EscrowStatus[];
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onDatePresetChange: (preset: DateRangePreset | null) => void;
  onStatusChange: (status: EscrowStatus | null) => void;
  onResetFilters: () => void;
  onPageChange: (page: number, pageSize: number) => void;
  onRefresh: () => void;
};

export function EscrowHistoryTab({
  t,
  formatCurrency,
  isLoading,
  escrows,
  columns,
  isMobile,
  currentPage,
  pageSize,
  total,
  dateRange,
  datePreset,
  status,
  statusOptions,
  onDateRangeChange,
  onDatePresetChange,
  onStatusChange,
  onResetFilters,
  onPageChange,
  onRefresh,
}: EscrowHistoryTabProps): React.ReactElement {
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
          <Space orientation="vertical" size="small" className={styles.filterSpace}>
            <span>{t("wallet.filters.dateRange") || "Date Range"}:</span>
            <RangePicker
              className={styles.filterRangePicker}
              value={dateRange}
              onChange={onDateRangeChange}
              format={DATE_FORMAT_ISO}
            />
          </Space>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <span>{t("wallet.filters.status") || "Status"}:</span>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={onStatusChange}
              placeholder={t("wallet.filters.selectStatus") || "Select status"}
            >
              {statusOptions.map((option) => (
                <Option key={option} value={option}>
                  {t(`wallet.escrow.status.${option}`)}
                </Option>
              ))}
            </Select>
          </Space>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Space orientation="vertical" size="small" className={styles.filterSpace}>
            <span />
            <Space className={styles.actionsSpace}>
              <Button
                icon={<UndoOutlined />}
                onClick={onResetFilters}
              >
                {t("common.reset") || "Reset"}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                loading={isLoading}
                type="primary"
              >
                {t("common.refresh") || "Refresh"}
              </Button>
            </Space>
          </Space>
        </Col>
      </Row>

      {isMobile ? (
        <EscrowCardGrid
          escrows={escrows}
          formatCurrency={formatCurrency}
          t={t}
          currentPage={currentPage}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      ) : (
        <Table<Escrow>
          columns={columns}
          dataSource={escrows}
          loading={isLoading}
          rowKey={(record) => record._id}
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
