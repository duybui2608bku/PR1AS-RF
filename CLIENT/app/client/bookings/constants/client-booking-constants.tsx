import type { ColumnsType } from "antd/es/table";
import { Typography, Tag, Space, Button } from "antd";
import type { Booking } from "@/lib/types/booking";
import { BookingStatus } from "@/lib/types/booking";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import type { Service } from "@/lib/types/worker";
import { getServiceName } from "@/lib/utils/worker.utils";
import {
  CancelledBy,
  CancellationReason,
  BookingTableColumnWidth,
  BookingTableColumnKey,
  getBookingStatusTagColor,
  getPaymentStatusTagColor,
  getPricingUnitLabel,
} from "@/lib/constants/booking";
import { BookingPaymentStatus, PricingUnit } from "@/lib/types/booking";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

interface CreateBookingColumnsOptions {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  serviceMap: Map<string, Service>;
  locale: string;
  onCancelBooking?: (bookingId: string) => void;
  onReviewBooking?: (bookingId: string) => void;
  onComplainBooking?: (bookingId: string) => void;
}

const canCancelBooking = (status: BookingStatus): boolean => {
  return (
    status === BookingStatus.PENDING ||
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.IN_PROGRESS
  );
};

const canReviewOrComplain = (status: BookingStatus): boolean => {
  return status === BookingStatus.COMPLETED;
};

export const createBookingColumns = ({
  t,
  formatCurrency,
  serviceMap,
  locale,
  onCancelBooking,
  onReviewBooking,
  onComplainBooking,
}: CreateBookingColumnsOptions): ColumnsType<Booking> => {
  return [
    {
      title: t("booking.table.serviceCode"),
      dataIndex: BookingTableColumnKey.SERVICE_CODE,
      key: BookingTableColumnKey.SERVICE_CODE,
      width: BookingTableColumnWidth.SERVICE_CODE,
      render: (serviceCode: string) => {
        const serviceName = getServiceName({
          serviceCode,
          serviceMap,
          locale,
        });
        return (
          <Space orientation="vertical" size="small">
            <Text strong>{serviceName}</Text>
          </Space>
        );
      },
    },
    {
      title: t("booking.table.workerName"),
      dataIndex: BookingTableColumnKey.WORKER,
      key: BookingTableColumnKey.WORKER,
      width: BookingTableColumnWidth.WORKER,
      render: (worker: unknown) => {
        const workerName =
          typeof worker === "object" && worker && "full_name" in worker
            ? (worker as { full_name: string }).full_name
            : "-";
        return <Text>{workerName}</Text>;
      },
    },
    {
      title: t("booking.table.schedule"),
      dataIndex: BookingTableColumnKey.SCHEDULE,
      key: BookingTableColumnKey.SCHEDULE,
      width: BookingTableColumnWidth.SCHEDULE,
      render: (schedule: Booking["schedule"]) => (
        <Space orientation="vertical" size="small">
          <Text>
            {t("booking.table.startTime")}:{" "}
            {formatDateTime(schedule.start_time)}
          </Text>
          <Text type="secondary">
            {t("booking.table.duration")}: {schedule.duration_hours}{" "}
            {t("booking.pricing.hourly")}
          </Text>
        </Space>
      ),
    },
    {
      title: t("booking.table.totalAmount"),
      dataIndex: BookingTableColumnKey.AMOUNT,
      key: BookingTableColumnKey.AMOUNT,
      width: BookingTableColumnWidth.AMOUNT,
      render: (_: unknown, record: Booking) => (
        <Space orientation="vertical" size="small">
          <Text strong style={{ color: "var(--ant-color-primary)" }}>
            {formatCurrency(record.pricing.total_amount)}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.pricing.quantity}{" "}
            {getPricingUnitLabel(record.pricing.unit as PricingUnit, t)} ×{" "}
            {formatCurrency(record.pricing.unit_price)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("booking.table.status"),
      dataIndex: BookingTableColumnKey.STATUS,
      key: BookingTableColumnKey.STATUS,
      width: BookingTableColumnWidth.STATUS,
      render: (status: BookingStatus) => (
        <Tag color={getBookingStatusTagColor(status)}>
          {t(`booking.status.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("booking.table.paymentStatus"),
      dataIndex: BookingTableColumnKey.PAYMENT_STATUS,
      key: BookingTableColumnKey.PAYMENT_STATUS,
      width: BookingTableColumnWidth.PAYMENT_STATUS,
      render: (paymentStatus: BookingPaymentStatus) => (
        <Tag color={getPaymentStatusTagColor(paymentStatus)}>
          {t(`booking.paymentStatus.${paymentStatus}`)}
        </Tag>
      ),
    },
    {
      title: t("booking.table.createdAt"),
      dataIndex: BookingTableColumnKey.CREATED_AT,
      key: BookingTableColumnKey.CREATED_AT,
      width: BookingTableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
    {
      title: t("booking.table.actions"),
      key: BookingTableColumnKey.ACTIONS,
      width: BookingTableColumnWidth.ACTIONS,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: Booking) => {
        const bookingId = (record as { id?: string }).id || record._id;

        if (canReviewOrComplain(record.status)) {
          return (
            <Space size="small">
              {onReviewBooking && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onReviewBooking(bookingId)}
                >
                  {t("booking.client.actions.review")}
                </Button>
              )}
              {onComplainBooking && (
                <Button
                  danger
                  size="small"
                  onClick={() => onComplainBooking(bookingId)}
                >
                  {t("booking.client.actions.complain")}
                </Button>
              )}
            </Space>
          );
        }

        if (onCancelBooking && canCancelBooking(record.status)) {
          return (
            <Button
              danger
              size="small"
              onClick={() => onCancelBooking(bookingId)}
            >
              {t("booking.worker.actions.cancel")}
            </Button>
          );
        }

        return null;
      },
    },
  ];
};

export { CancelledBy, CancellationReason };
