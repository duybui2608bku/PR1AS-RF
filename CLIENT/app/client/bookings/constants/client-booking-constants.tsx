import type { ColumnsType } from "antd/es/table";
import { Typography, Tag, Space, Button, Popconfirm } from "antd";
import type { Booking } from "@/lib/types/booking";
import {
  BookingStatus,
  BookingPaymentStatus,
  PricingUnit,
} from "@/lib/types/booking";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import type { Service } from "@/lib/types/worker";
import { getServiceName } from "@/lib/utils/worker.utils";

const { Text } = Typography;

enum TableColumnWidth {
  SERVICE_CODE = 180,
  WORKER = 150,
  SCHEDULE = 200,
  AMOUNT = 150,
  STATUS = 120,
  PAYMENT_STATUS = 200,
  CREATED_AT = 180,
  ACTIONS = 120,
}

enum TableColumnKeys {
  SERVICE_CODE = "service_code",
  WORKER = "worker_id",
  SCHEDULE = "schedule",
  AMOUNT = "amount",
  STATUS = "status",
  PAYMENT_STATUS = "payment_status",
  CREATED_AT = "created_at",
  ACTIONS = "actions",
}

export enum CancelledBy {
  CLIENT = "client",
  WORKER = "worker",
}

export enum CancellationReason {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
  PAYMENT_FAILED = "payment_failed",
  POLICY_VIOLATION = "policy_violation",
  OTHER = "other",
}

const getBookingStatusTagColor = (status: BookingStatus): string => {
  const colorMap: Record<BookingStatus, string> = {
    [BookingStatus.PENDING]: "orange",
    [BookingStatus.CONFIRMED]: "blue",
    [BookingStatus.IN_PROGRESS]: "purple",
    [BookingStatus.COMPLETED]: "green",
    [BookingStatus.CANCELLED]: "default",
    [BookingStatus.REJECTED]: "red",
    [BookingStatus.DISPUTED]: "volcano",
  };
  return colorMap[status] || "default";
};

const getPaymentStatusTagColor = (status: BookingPaymentStatus): string => {
  const colorMap: Record<BookingPaymentStatus, string> = {
    [BookingPaymentStatus.PENDING]: "orange",
    [BookingPaymentStatus.PAID]: "green",
    [BookingPaymentStatus.PARTIALLY_REFUNDED]: "blue",
    [BookingPaymentStatus.REFUNDED]: "default",
  };
  return colorMap[status] || "default";
};

const getPricingUnitLabel = (unit: PricingUnit, t: TFunction): string => {
  const unitMap: Record<PricingUnit, string> = {
    [PricingUnit.HOURLY]: t("booking.pricing.hourly"),
    [PricingUnit.DAILY]: t("booking.pricing.daily"),
    [PricingUnit.MONTHLY]: t("booking.pricing.monthly"),
  };
  return unitMap[unit] || unit;
};

type FormatCurrencyFunction = (amount: number) => string;

interface CreateBookingColumnsOptions {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  serviceMap: Map<string, Service>;
  locale: string;
  onCancelBooking?: (bookingId: string) => void;
}

const canCancelBooking = (status: BookingStatus): boolean => {
  return (
    status === BookingStatus.PENDING ||
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.IN_PROGRESS
  );
};

export const createBookingColumns = ({
  t,
  formatCurrency,
  serviceMap,
  locale,
  onCancelBooking,
}: CreateBookingColumnsOptions): ColumnsType<Booking> => {
  return [
    {
      title: t("booking.table.serviceCode"),
      dataIndex: TableColumnKeys.SERVICE_CODE,
      key: TableColumnKeys.SERVICE_CODE,
      width: TableColumnWidth.SERVICE_CODE,
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
      dataIndex: TableColumnKeys.WORKER,
      key: TableColumnKeys.WORKER,
      width: TableColumnWidth.WORKER,
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
      dataIndex: TableColumnKeys.SCHEDULE,
      key: TableColumnKeys.SCHEDULE,
      width: TableColumnWidth.SCHEDULE,
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
      dataIndex: TableColumnKeys.AMOUNT,
      key: TableColumnKeys.AMOUNT,
      width: TableColumnWidth.AMOUNT,
      render: (_: unknown, record: Booking) => (
        <Space orientation="vertical" size="small">
          <Text strong style={{ color: "var(--ant-color-primary)" }}>
            {formatCurrency(record.pricing.total_amount)}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.pricing.quantity}{" "}
            {getPricingUnitLabel(record.pricing.unit, t)} ×{" "}
            {formatCurrency(record.pricing.unit_price)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("booking.table.status"),
      dataIndex: TableColumnKeys.STATUS,
      key: TableColumnKeys.STATUS,
      width: TableColumnWidth.STATUS,
      render: (status: BookingStatus) => (
        <Tag color={getBookingStatusTagColor(status)}>
          {t(`booking.status.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("booking.table.paymentStatus"),
      dataIndex: TableColumnKeys.PAYMENT_STATUS,
      key: TableColumnKeys.PAYMENT_STATUS,
      width: TableColumnWidth.PAYMENT_STATUS,
      render: (paymentStatus: BookingPaymentStatus) => (
        <Tag color={getPaymentStatusTagColor(paymentStatus)}>
          {t(`booking.paymentStatus.${paymentStatus}`)}
        </Tag>
      ),
    },
    {
      title: t("booking.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: TableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
    {
      title: t("booking.table.actions"),
      key: TableColumnKeys.ACTIONS,
      width: TableColumnWidth.ACTIONS,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: Booking) => {
        if (!onCancelBooking || !canCancelBooking(record.status)) {
          return null;
        }
        return (
          <Button
            danger
            size="small"
            onClick={() => onCancelBooking(record.id)}
          >
            {t("booking.worker.actions.cancel")}
          </Button>
        );
      },
    },
  ];
};
