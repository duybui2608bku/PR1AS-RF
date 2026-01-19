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

const { Text } = Typography;

enum TableColumnWidth {
  SERVICE_CODE = 120,
  SCHEDULE = 200,
  AMOUNT = 150,
  STATUS = 120,
  PAYMENT_STATUS = 150,
  ACTIONS = 200,
  CREATED_AT = 180,
}

enum TableColumnKeys {
  SERVICE_CODE = "service_code",
  SCHEDULE = "schedule",
  AMOUNT = "amount",
  STATUS = "status",
  PAYMENT_STATUS = "payment_status",
  ACTIONS = "actions",
  CREATED_AT = "created_at",
}

enum WorkerActionType {
  CONFIRM = "confirm",
  REJECT = "reject",
  START = "start",
  COMPLETE = "complete",
  CANCEL = "cancel",
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
type OnActionCallback = (
  bookingId: string,
  action: WorkerActionType,
  workerResponse?: string
) => void;

interface CreateWorkerBookingColumnsParams {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  onAction: OnActionCallback;
}

export const createWorkerBookingColumns = ({
  t,
  formatCurrency,
  onAction,
}: CreateWorkerBookingColumnsParams): ColumnsType<Booking> => {
  return [
    {
      title: t("booking.table.serviceCode"),
      dataIndex: TableColumnKeys.SERVICE_CODE,
      key: TableColumnKeys.SERVICE_CODE,
      width: TableColumnWidth.SERVICE_CODE,
      render: (serviceCode: string) => <Text code>{serviceCode}</Text>,
    },
    {
      title: t("booking.table.schedule"),
      dataIndex: TableColumnKeys.SCHEDULE,
      key: TableColumnKeys.SCHEDULE,
      width: TableColumnWidth.SCHEDULE,
      render: (schedule: Booking["schedule"]) => (
        <Space direction="vertical" size="small">
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
        <Space direction="vertical" size="small">
          <Text strong style={{ color: "var(--ant-color-primary)" }}>
            {formatCurrency(record.pricing.total_amount)}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {t("booking.worker.payout")}:{" "}
            {formatCurrency(record.pricing.worker_payout)}
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
      title: t("booking.table.actions"),
      dataIndex: TableColumnKeys.ACTIONS,
      key: TableColumnKeys.ACTIONS,
      width: TableColumnWidth.ACTIONS,
      fixed: "right",
      render: (_: unknown, record: Booking) => {
        const canConfirm = record.status === BookingStatus.PENDING;
        const canReject = record.status === BookingStatus.PENDING;
        const canStart =
          record.status === BookingStatus.CONFIRMED &&
          record.payment_status === BookingPaymentStatus.PAID;
        const canComplete = record.status === BookingStatus.IN_PROGRESS;
        const canCancel =
          record.status === BookingStatus.PENDING ||
          record.status === BookingStatus.CONFIRMED ||
          record.status === BookingStatus.IN_PROGRESS;

        return (
          <Space size="small" wrap>
            {canConfirm && (
              <Button
                type="primary"
                size="small"
                onClick={() => onAction(record.id, WorkerActionType.CONFIRM)}
              >
                {t("booking.worker.actions.confirm")}
              </Button>
            )}
            {canReject && (
              <Popconfirm
                title={t("booking.worker.actions.rejectConfirm")}
                onConfirm={() => onAction(record.id, WorkerActionType.REJECT)}
                okText={t("common.confirm")}
                cancelText={t("common.cancel")}
              >
                <Button size="small" danger>
                  {t("booking.worker.actions.reject")}
                </Button>
              </Popconfirm>
            )}
            {canStart && (
              <Button
                type="primary"
                size="small"
                onClick={() => onAction(record.id, WorkerActionType.START)}
              >
                {t("booking.worker.actions.start")}
              </Button>
            )}
            {canComplete && (
              <Button
                type="primary"
                size="small"
                onClick={() => onAction(record.id, WorkerActionType.COMPLETE)}
              >
                {t("booking.worker.actions.complete")}
              </Button>
            )}
            {canCancel && (
              <Popconfirm
                title={t("booking.worker.actions.cancelConfirm")}
                onConfirm={() => onAction(record.id, WorkerActionType.CANCEL)}
                okText={t("common.confirm")}
                cancelText={t("common.cancel")}
              >
                <Button size="small" danger>
                  {t("booking.worker.actions.cancel")}
                </Button>
              </Popconfirm>
            )}
            {!canConfirm &&
              !canReject &&
              !canStart &&
              !canComplete &&
              !canCancel && (
                <Text type="secondary">
                  {t("booking.worker.actions.noActions")}
                </Text>
              )}
          </Space>
        );
      },
    },
    {
      title: t("booking.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: TableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];
};

export { WorkerActionType };
