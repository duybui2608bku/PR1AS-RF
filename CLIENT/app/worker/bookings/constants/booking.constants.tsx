import type { ColumnsType } from "antd/es/table";
import { Typography, Tag, Space, Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { Booking } from "@/lib/types/booking";
import {
  BookingStatus,
  BookingPaymentStatus,
  PricingUnit,
} from "@/lib/types/booking";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import { getServiceName } from "@/lib/utils/worker.utils";
import type { Service } from "@/lib/types/worker";
import { WorkerBookingActions } from "@/app/worker/bookings/components/WorkerBookingActions";
import { FontSize } from "@/lib/constants/ui.constants";

const { Text } = Typography;

enum TableColumnWidth {
  SERVICE_CODE = 150,
  CLIENT = 150,
  SCHEDULE = 200,
  AMOUNT = 150,
  STATUS = 120,
  PAYMENT_STATUS = 200,
  ACTIONS = 150,
  CREATED_AT = 180,
}

enum TableColumnKeys {
  SERVICE_CODE = "service_code",
  CLIENT = "client_id",
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

export enum CANCLE_REASON {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
  PAYMENT_FAILED = "payment_failed",
  POLICY_VIOLATION = "policy_violation",
  OTHER = "other",
}

export const getBookingStatusTagColor = (status: BookingStatus): string => {
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

export const getPaymentStatusTagColor = (
  status: BookingPaymentStatus
): string => {
  const colorMap: Record<BookingPaymentStatus, string> = {
    [BookingPaymentStatus.PENDING]: "orange",
    [BookingPaymentStatus.PAID]: "green",
    [BookingPaymentStatus.PARTIALLY_REFUNDED]: "blue",
    [BookingPaymentStatus.REFUNDED]: "default",
  };
  return colorMap[status] || "default";
};

export const getClientName = (record: Booking): string => {
  const client = (record as unknown as Record<string, unknown>).client_id;
  return (typeof client === "object" && client && "full_name" in client)
    ? (client as { full_name: string }).full_name
    : "-";
};

type FormatCurrencyFunction = (amount: number) => string;

const getPricingUnitLabel = (unit: PricingUnit, t: TFunction): string => {
  const unitMap: Record<PricingUnit, string> = {
    [PricingUnit.HOURLY]: t("booking.pricing.hourly"),
    [PricingUnit.DAILY]: t("booking.pricing.daily"),
    [PricingUnit.MONTHLY]: t("booking.pricing.monthly"),
  };
  return unitMap[unit] || unit;
};

const getCancellationReasonLabel = (
  reason: string,
  t: TFunction
): string => {
  const reasonMap: Record<string, string> = {
    [CANCLE_REASON.CLIENT_REQUEST]: t("booking.cancel.reasons.clientRequest"),
    [CANCLE_REASON.WORKER_UNAVAILABLE]: t(
      "booking.cancel.reasons.workerUnavailable"
    ),
    [CANCLE_REASON.SCHEDULE_CONFLICT]: t(
      "booking.cancel.reasons.scheduleConflict"
    ),
    [CANCLE_REASON.EMERGENCY]: t("booking.cancel.reasons.emergency"),
    [CANCLE_REASON.PAYMENT_FAILED]: t("booking.cancel.reasons.paymentFailed"),
    [CANCLE_REASON.POLICY_VIOLATION]: t(
      "booking.cancel.reasons.policyViolation"
    ),
    [CANCLE_REASON.OTHER]: t("booking.cancel.reasons.other"),
  };
  return reasonMap[reason] || reason;
};

const renderCancellationPopover = (
  cancellation: Booking["cancellation"],
  t: TFunction,
  formatCurrency: FormatCurrencyFunction
): React.ReactElement => {
  if (!cancellation) {
    return <></>;
  }

  return (
    <Space orientation="vertical" size="small" style={{ minWidth: 250 }}>
      <Space orientation="vertical" size={0}>
        <Text strong>{t("booking.cancel.cancelledAt")}:</Text>
        <Text>{formatDateTime(cancellation.cancelled_at)}</Text>
      </Space>
      <Space orientation="vertical" size={0}>
        <Text strong>{t("booking.cancel.cancelledBy")}:</Text>
        <Text>
          {cancellation.cancelled_by === "worker"
            ? t("booking.cancel.cancelledByWorker")
            : t("booking.cancel.cancelledByClient")}
        </Text>
      </Space>
      <Space orientation="vertical" size={0}>
        <Text strong>{t("booking.cancel.reason")}:</Text>
        <Text>{getCancellationReasonLabel(cancellation.reason, t)}</Text>
      </Space>
      {cancellation.notes && (
        <Space orientation="vertical" size={0}>
          <Text strong>{t("booking.cancel.notes")}:</Text>
          <Text>{cancellation.notes}</Text>
        </Space>
      )}
      <Space orientation="vertical" size={0}>
        <Text strong>{t("booking.cancel.refundAmount")}:</Text>
        <Text>{formatCurrency(cancellation.refund_amount)}</Text>
      </Space>
      <Space orientation="vertical" size={0}>
        <Text strong>{t("booking.cancel.penaltyAmount")}:</Text>
        <Text>{formatCurrency(cancellation.penalty_amount)}</Text>
      </Space>
    </Space>
  );
};

type OnActionCallback = (
  bookingId: string,
  action: WorkerActionType,
  workerResponse?: string
) => void;

interface WorkerBookingActionsProps {
  record: Booking;
  onAction: OnActionCallback;
  t: TFunction;
}

interface CreateWorkerBookingColumnsParams {
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
  onAction: OnActionCallback;
  serviceMap: Map<string, Service>;
  locale: string;
}

export const createWorkerBookingColumns = ({
  t,
  formatCurrency,
  onAction,
  serviceMap,
  locale,
}: CreateWorkerBookingColumnsParams): ColumnsType<Booking> => {
  return [
    {
      title: t("booking.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: TableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
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
      title: t("booking.table.clientName"),
      dataIndex: TableColumnKeys.CLIENT,
      key: TableColumnKeys.CLIENT,
      width: TableColumnWidth.CLIENT,
      render: (_: unknown, record: Booking) => (
        <Text>{getClientName(record)}</Text>
      ),
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
          <Text type="secondary" style={{ fontSize: FontSize.XS }}>
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
      render: (status: BookingStatus, record: Booking) => {
        const isCancelledWithInfo =
          status === BookingStatus.CANCELLED && record.cancellation;

        const statusTag = (
          <Tag color={getBookingStatusTagColor(status)}>
            <Space size="small">
              {t(`booking.status.${status}`)}
              {isCancelledWithInfo && <InfoCircleOutlined />}
            </Space>
          </Tag>
        );

        if (isCancelledWithInfo) {
          return (
            <Popover
              content={renderCancellationPopover(
                record.cancellation,
                t,
                formatCurrency
              )}
              trigger="hover"
              placement="top"
            >
              {statusTag}
            </Popover>
          );
        }

        return statusTag;
      },
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
      align: "center",
      render: (_: unknown, record: Booking) => (
        <WorkerBookingActions record={record} onAction={onAction} t={t} />
      ),
    },

  ];
};

export { WorkerActionType };
