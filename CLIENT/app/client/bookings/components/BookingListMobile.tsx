"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { Card, List, Typography, Tag, Space, Button } from "antd";
import type { Booking } from "@/lib/types/booking";
import { BookingStatus } from "@/lib/types/booking";
import type { Service } from "@/lib/types/worker";
import { getServiceName } from "@/lib/utils/worker.utils";
import { formatDateTime } from "@/app/func/func";
import {
  getBookingStatusTagColor,
} from "@/lib/constants/booking";
import {
  canCancelBooking,
  canComplainBooking,
  canOpenComplaintChat,
  canReviewBooking,
} from "@/app/client/bookings/constants/client-booking-constants";
import { CancellationInfoTooltip } from "@/app/client/bookings/components/CancellationInfoTooltip";
import type { TFunction } from "i18next";
import { PAGE_SIZE_OPTIONS } from "@/app/constants/constants";
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
  onOpenComplaintChat?: (bookingId: string) => void;
}

interface BookingItemProps {
  record: Booking;
  serviceMap: Map<string, Service>;
  formatCurrency: FormatCurrencyFunction;
  locale: string;
  t: TFunction;
  onCancelBooking?: (bookingId: string) => void;
  onReviewBooking?: (bookingId: string) => void;
  onComplainBooking?: (bookingId: string) => void;
  onOpenComplaintChat?: (bookingId: string) => void;
}

const getWorkerName = (worker: unknown): string => {
  return typeof worker === "object" && worker && "full_name" in worker
    ? (worker as { full_name: string }).full_name
    : "-";
};

const BookingItem = memo(function BookingItem({
  record,
  serviceMap,
  formatCurrency,
  locale,
  t,
  onCancelBooking,
  onReviewBooking,
  onComplainBooking,
  onOpenComplaintChat,
}: BookingItemProps) {
  const bookingId = (record as { id?: string }).id || record._id;
  const serviceName = getServiceName({
    serviceCode: record.service_code,
    serviceMap,
    locale,
  });

  const actions: ReactNode[] = [];
  if (canReviewBooking(record.status)) {
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
  }
  if (canComplainBooking(record.status) && onComplainBooking) {
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
  if (canOpenComplaintChat(record.status) && onOpenComplaintChat) {
    actions.push(
      <Button
        key="complaint-chat"
        type="primary"
        size="small"
        onClick={() => onOpenComplaintChat(bookingId)}
      >
        {t("booking.client.actions.openComplaintChat")}
      </Button>
    );
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
        className={styles.card}
        actions={actions.length > 0 ? actions : undefined}
      >
        <Space orientation="vertical" size="small" className={styles.spaceFull}>
          <Text strong>{serviceName}</Text>
          <Text type="secondary">
            {t("booking.table.workerName")}: {getWorkerName(record.worker_id)}
          </Text>
          <Space orientation="vertical" size={0}>
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
            <Space size={4}>
              <Tag color={getBookingStatusTagColor(record.status)}>
                {t(`booking.status.${record.status}`)}
              </Tag>
              {record.status === BookingStatus.CANCELLED &&
              record.cancellation ? (
                <CancellationInfoTooltip
                  cancellation={record.cancellation}
                  t={t}
                  formatCurrency={formatCurrency}
                />
              ) : null}
            </Space>
          </Space>
          <Text type="secondary" className={styles.metaText}>
            {t("booking.table.createdAt")}: {formatDateTime(record.created_at)}
          </Text>
        </Space>
      </Card>
    </List.Item>
  );
});

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
  onOpenComplaintChat,
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
      renderItem={(record) => (
        <BookingItem
          record={record}
          serviceMap={serviceMap}
          formatCurrency={formatCurrency}
          locale={locale}
          t={t}
          onCancelBooking={onCancelBooking}
          onReviewBooking={onReviewBooking}
          onComplainBooking={onComplainBooking}
          onOpenComplaintChat={onOpenComplaintChat}
        />
      )}
    />
  );
}
