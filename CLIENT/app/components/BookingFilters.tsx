"use client";

import React, { memo } from "react";
import { Select, Row, Col, Space, Button, DatePicker, Typography } from "antd";
import { UndoOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Dayjs } from "dayjs";
import { BookingStatus, BookingPaymentStatus } from "@/lib/types/booking";
import { DATE_FORMAT_ISO } from "@/app/constants/constants";
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "./BookingFilters.module.scss";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

interface BookingFiltersProps {
  statusFilter: BookingStatus | undefined;
  paymentStatusFilter: BookingPaymentStatus | undefined;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  isLoading: boolean;
  onStatusChange: (value: BookingStatus | "all") => void;
  onPaymentStatusChange: (value: BookingPaymentStatus | "all") => void;
  onDateRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onReset: () => void;
  onRefresh: () => void;
  extraStatuses?: BookingStatus[];
  className?: string;
}

export const BookingFilters = memo(function BookingFilters({
  statusFilter,
  paymentStatusFilter,
  dateRange,
  isLoading,
  onStatusChange,
  onPaymentStatusChange,
  onDateRangeChange,
  onReset,
  onRefresh,
  className,
}: BookingFiltersProps) {
  const { t } = useTranslation();

  const statusOptions = [
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.REJECTED,
    BookingStatus.DISPUTED,
  ];

  const paymentStatusOptions = [
    BookingPaymentStatus.PENDING,
    BookingPaymentStatus.PAID,
    BookingPaymentStatus.PARTIALLY_REFUNDED,
    BookingPaymentStatus.REFUNDED,
  ];

  return (
    <Row gutter={[Spacing.LG, Spacing.LG]} className={className}>
      <Col xs={24} sm={12} md={5}>
        <Space orientation="vertical" size="small" className={styles.filterSpace}>
          <Text>{t("booking.list.filters.status")}:</Text>
          <Select
            className={styles.filterControl}
            value={statusFilter || "all"}
            onChange={onStatusChange}
            allowClear
          >
            <Option value="all">{t("booking.list.filters.all")}</Option>
            {statusOptions.map((status) => (
              <Option key={status} value={status}>
                {t(`booking.status.${status}`)}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Space orientation="vertical" size="small" className={styles.filterSpace}>
          <Text>{t("booking.list.filters.paymentStatus")}:</Text>
          <Select
            className={styles.filterControl}
            value={paymentStatusFilter || "all"}
            onChange={onPaymentStatusChange}
            allowClear
          >
            <Option value="all">{t("booking.list.filters.all")}</Option>
            {paymentStatusOptions.map((status) => (
              <Option key={status} value={status}>
                {t(`booking.paymentStatus.${status}`)}
              </Option>
            ))}
          </Select>
        </Space>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Space orientation="vertical" size="small" className={styles.filterSpace}>
          <Text>{t("booking.list.filters.dateRange")}:</Text>
          <RangePicker
            className={styles.filterControl}
            value={dateRange}
            onChange={onDateRangeChange}
            format={DATE_FORMAT_ISO}
          />
        </Space>
      </Col>
      <Col xs={12} sm={6} md={4}>
        <Space orientation="vertical" size="small" className={styles.filterSpace}>
          <Text className={styles.actionSpacer}> </Text>
          <Button
            icon={<UndoOutlined />}
            onClick={onReset}
            block
          >
            {t("common.reset")}
          </Button>
        </Space>
      </Col>
      <Col xs={12} sm={6} md={4}>
        <Space orientation="vertical" size="small" className={styles.filterSpace}>
          <Text className={styles.actionSpacer}> </Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={isLoading}
            block
          >
            {t("common.refresh")}
          </Button>
        </Space>
      </Col>
    </Row>
  );
});
