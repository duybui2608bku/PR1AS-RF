import type { ColumnsType } from "antd/es/table";
import { Typography, Tag, Space, Popover } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { Booking } from "@/lib/types/booking";
import { BookingStatus, PricingUnit } from "@/lib/types/booking";
import { formatDateTime } from "@/app/func/func";
import type { TFunction } from "i18next";
import { getServiceName } from "@/lib/utils/worker.utils";
import type { Service } from "@/lib/types/worker";
import { WorkerBookingActions } from "@/app/worker/bookings/components/WorkerBookingActions";
import { FontSize } from "@/lib/constants/ui.constants";
import {
  CancellationReason,
  WorkerActionType,
  BookingTableColumnWidth,
  BookingTableColumnKey,
  getBookingStatusTagColor,
  getPaymentStatusTagColor,
  getPricingUnitLabel,
} from "@/lib/constants/booking";
import { BookingPaymentStatus } from "@/lib/types/booking";

const { Text } = Typography;

export const getClientName = (record: Booking): string => {
  const client = (record as unknown as Record<string, unknown>).client_id;
  return (typeof client === "object" && client && "full_name" in client)
    ? (client as { full_name: string }).full_name
    : "-";
};

type FormatCurrencyFunction = (amount: number) => string;

const getCancellationReasonLabel = (
  reason: string,
  t: TFunction
): string => {
  const reasonMap: Record<string, string> = {
    [CancellationReason.CLIENT_REQUEST]: t("booking.cancel.reasons.clientRequest"),
    [CancellationReason.WORKER_UNAVAILABLE]: t(
      "booking.cancel.reasons.workerUnavailable"
    ),
    [CancellationReason.SCHEDULE_CONFLICT]: t(
      "booking.cancel.reasons.scheduleConflict"
    ),
    [CancellationReason.EMERGENCY]: t("booking.cancel.reasons.emergency"),
    [CancellationReason.PAYMENT_FAILED]: t("booking.cancel.reasons.paymentFailed"),
    [CancellationReason.POLICY_VIOLATION]: t(
      "booking.cancel.reasons.policyViolation"
    ),
    [CancellationReason.OTHER]: t("booking.cancel.reasons.other"),
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
      dataIndex: BookingTableColumnKey.CREATED_AT,
      key: BookingTableColumnKey.CREATED_AT,
      width: BookingTableColumnWidth.CREATED_AT,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
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
      title: t("booking.table.clientName"),
      dataIndex: BookingTableColumnKey.CLIENT,
      key: BookingTableColumnKey.CLIENT,
      width: BookingTableColumnWidth.CLIENT,
      render: (_: unknown, record: Booking) => (
        <Text>{getClientName(record)}</Text>
      ),
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
            {getPricingUnitLabel(PricingUnit.HOURLY, t)}
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
          <Text type="secondary" style={{ fontSize: FontSize.XS }}>
            {t("booking.worker.payout")}:{" "}
            {formatCurrency(record.pricing.worker_payout)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("booking.table.status"),
      dataIndex: BookingTableColumnKey.STATUS,
      key: BookingTableColumnKey.STATUS,
      width: BookingTableColumnWidth.STATUS,
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
      title: t("booking.table.actions"),
      dataIndex: BookingTableColumnKey.ACTIONS,
      key: BookingTableColumnKey.ACTIONS,
      width: BookingTableColumnWidth.ACTIONS,
      fixed: "right",
      align: "center",
      render: (_: unknown, record: Booking) => (
        <WorkerBookingActions record={record} onAction={onAction} t={t} />
      ),
    },

  ];
};

export { WorkerActionType, CancellationReason };
