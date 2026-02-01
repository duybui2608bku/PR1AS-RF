"use client";

import type { ReactNode } from "react";
import { Card, List, Typography, Tag, Space, Button } from "antd";
import type { Booking } from "@/lib/types/booking";
import { BookingStatus, BookingPaymentStatus, PricingUnit } from "@/lib/types/booking";
import type { Service } from "@/lib/types/worker";
import { getServiceName } from "@/lib/utils/worker.utils";
import { formatDateTime } from "@/app/func/func";
import {
  getBookingStatusTagColor,
  getPaymentStatusTagColor,
  getPricingUnitLabel,
} from "@/lib/constants/booking";
import {
  canCancelBooking,
  canReviewOrComplain,
} from "@/app/client/bookings/constants/client-booking-constants";
import { CancellationInfoTooltip } from "@/app/client/bookings/components/CancellationInfoTooltip";
import type { TFunction } from "i18next";
import { PAGE_SIZE_OPTIONS } from "@/app/constants/constants";
import { FontSize } from "@/lib/constants/ui.constants";
import styles from "./BookingListMobile.module.scss";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

interface BookingListMobileProps {
  data: Booking[];
  loading: boolean;
  serviceMap: Map<string, Service>;
  formatCurrency: FormatCurrencyFunction;
  locale: string;
  t: TFunction;
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onCancelBooking?: (bookingId: string) => void;
  onReviewBooking?: (bookingId: string) => void;
  onComplainBooking?: (bookingId: string) => void;
}

const getWorkerName = (worker: unknown): string => {
  return typeof worker === "object" && worker && "full_name" in worker
    ? (worker as { full_name: string }).full_name
    : "-";
};

export function BookingListMobile({
  data,
  loading,
  serviceMap,
  formatCurrency,
  locale,
  t,
  currentPage,
  pageSize,
  total,
  onPageChange,
  onCancelBooking,
  onReviewBooking,
  onComplainBooking,
}: BookingListMobileProps) {
  return (
    <List<Booking>
      dataSource={data}
      loading={loading}
      rowKey={(record) => (record as { id?: string }).id || record._id}
      pagination={{
        current: currentPage,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (totalCount) => t("common.pagination.total", { total: totalCount }),
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        onChange: (page, size) => onPageChange(page, size ?? pageSize),
      }}
      renderItem={(record) => {
        const bookingId = (record as { id?: string }).id || record._id;
        const serviceName = getServiceName({
          serviceCode: record.service_code,
          serviceMap,
          locale,
        });

        const actions: ReactNode[] = [];
        if (canReviewOrComplain(record.status)) {
          if (onReviewBooking) {
            actions.push(
              <Button
                key="review"
                type="primary"
                size="small"
                onClick={() => onReviewBooking(bookingId)}
              >
                {t("booking.client.actions.review")}
              </Button>
            );
          }
          if (onComplainBooking) {
            actions.push(
              <Button
                key="complain"
                danger
                size="small"
                onClick={() => onComplainBooking(bookingId)}
              >
                {t("booking.client.actions.complain")}
              </Button>
            );
          }
        }
        if (canCancelBooking(record.status) && onCancelBooking) {
          actions.push(
            <Button
              key="cancel"
              danger
              size="small"
              onClick={() => onCancelBooking(bookingId)}
            >
              {t("booking.worker.actions.cancel")}
            </Button>
          );
        }

        return (
          <List.Item>
            <Card
              size="small"
              style={{ width: "100%" }}
              actions={actions.length > 0 ? actions : undefined}
            >
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text strong>{serviceName}</Text>
                <Text type="secondary">
                  {t("booking.table.workerName")}: {getWorkerName(record.worker_id)}
                </Text>
                <Space direction="vertical" size={0}>
                  <Text>
                    {t("booking.table.startTime")}:{" "}
                    {formatDateTime(record.schedule.start_time)}
                  </Text>
                  <Text type="secondary">
                    {t("booking.table.duration")}: {record.schedule.duration_hours}{" "}
                    {t("booking.pricing.hourly")}
                  </Text>
                </Space>
                <Space wrap>
                  <Text strong style={{ color: "var(--ant-color-primary)" }}>
                    {formatCurrency(record.pricing.total_amount)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.pricing.quantity}{" "}
                    {getPricingUnitLabel(record.pricing.unit as PricingUnit, t)} ×{" "}
                    {formatCurrency(record.pricing.unit_price)}
                  </Text>
                </Space>
                <Space wrap>
                  <Space size={4}>
                    <Tag color={getBookingStatusTagColor(record.status)}>
                      {t(`booking.status.${record.status}`)}
                    </Tag>
                    {record.status === BookingStatus.CANCELLED &&
                      record.cancellation && (
                        <CancellationInfoTooltip
                          cancellation={record.cancellation}
                          t={t}
                          formatCurrency={formatCurrency}
                        />
                      )}
                  </Space>
                  <Tag color={getPaymentStatusTagColor(record.payment_status)}>
                    {t(`booking.paymentStatus.${record.payment_status}`)}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("booking.table.createdAt")}: {formatDateTime(record.created_at)}
                </Text>
              </Space>
            </Card>
          </List.Item>
        );
      }}
    />
  );
}
