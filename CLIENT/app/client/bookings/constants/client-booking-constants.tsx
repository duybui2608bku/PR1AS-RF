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
} from "@/lib/constants/booking";
import { CancellationInfoTooltip } from "@/app/client/bookings/components/CancellationInfoTooltip";

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
  onOpenComplaintChat?: (bookingId: string) => void;
}

export const canCancelBooking = (status: BookingStatus): boolean => {
  return (
    status === BookingStatus.PENDING ||
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.IN_PROGRESS
  );
};

export const canReviewBooking = (status: BookingStatus): boolean => {
  return status === BookingStatus.COMPLETED;
};

export const canComplainBooking = (status: BookingStatus): boolean => {
  return (
    status === BookingStatus.IN_PROGRESS || status === BookingStatus.COMPLETED
  );
};

export const canOpenComplaintChat = (status: BookingStatus): boolean => {
  return status === BookingStatus.DISPUTED;
};

export const isBookingExpired = (schedule: Booking["schedule"], status: BookingStatus): boolean => {
  if (status !== BookingStatus.PENDING) {
    return false;
  }
  const startTime = new Date(schedule.start_time).getTime();
  const currentTime = new Date().getTime();
  return startTime < currentTime;
};

export const createBookingColumns = ({
  t,
  formatCurrency,
  serviceMap,
  locale,
  onCancelBooking,
  onReviewBooking,
  onComplainBooking,
  onOpenComplaintChat,
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
      title: t("booking.table.status"),
      dataIndex: BookingTableColumnKey.STATUS,
      key: BookingTableColumnKey.STATUS,
      width: BookingTableColumnWidth.STATUS,
      render: (status: BookingStatus, record: Booking) => {
        const isExpired = isBookingExpired(record.schedule, status);
        const displayStatus = isExpired ? BookingStatus.EXPIRED : status;
        
        return (
          <Space size={4}>
            <Tag color={getBookingStatusTagColor(displayStatus)}>
              {t(`booking.status.${displayStatus}`)}
            </Tag>
            {status === BookingStatus.CANCELLED && record.cancellation && (
              <CancellationInfoTooltip
                cancellation={record.cancellation}
                t={t}
                formatCurrency={formatCurrency}
              />
            )}
          </Space>
        );
      },
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
        const isExpired = isBookingExpired(record.schedule, record.status);

        // Không hiển thị actions cho booking đã expired
        if (isExpired) {
          return null;
        }

        if (canReviewBooking(record.status) || canComplainBooking(record.status)) {
          return (
            <Space size="small">
              {onReviewBooking && canReviewBooking(record.status) && (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onReviewBooking(bookingId)}
                >
                  {t("booking.client.actions.review")}
                </Button>
              )}
              {onComplainBooking && canComplainBooking(record.status) && (
                <Button
                  danger
                  size="small"
                  onClick={() => onComplainBooking(bookingId)}
                >
                  {t("booking.client.actions.complain")}
                </Button>
              )}
              {onCancelBooking && canCancelBooking(record.status) && (
                <Button
                  danger
                  size="small"
                  onClick={() => onCancelBooking(bookingId)}
                >
                  {t("booking.worker.actions.cancel")}
                </Button>
              )}
            </Space>
          );
        }

        if (onOpenComplaintChat && canOpenComplaintChat(record.status)) {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => onOpenComplaintChat(bookingId)}
            >
              {t("booking.client.actions.openComplaintChat")}
            </Button>
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
