"use client";

import { Space, Button, Popconfirm, Typography } from "antd";
import type { TFunction } from "i18next";
import { expireDate } from "@/app/func/func";
import {
  BookingStatus,
  BookingPaymentStatus,
  type Booking,
} from "@/lib/types/booking";
import { WorkerActionType } from "@/app/worker/bookings/constants/booking.constants";

const { Text } = Typography;

interface WorkerBookingActionsProps {
  record: Booking;
  onAction: (
    bookingId: string,
    action: WorkerActionType,
    workerResponse?: string
  ) => void;
  t: TFunction;
}

export function WorkerBookingActions({
  record,
  onAction,
  t,
}: WorkerBookingActionsProps): React.ReactElement {
  const scheduleExpired = expireDate(record.schedule.start_time);
  if (scheduleExpired) {
    return (
      <Button size="small" disabled>
        {t("booking.worker.actions.expired")}
      </Button>
    );
  }

  const canConfirm = record.status === BookingStatus.PENDING;
  const canStart =
    record.status === BookingStatus.CONFIRMED &&
    record.payment_status === BookingPaymentStatus.PAID;
  const canComplete = record.status === BookingStatus.IN_PROGRESS;

  const renderRejectOrCancel =
    record.status === BookingStatus.CONFIRMED ? (
      <Popconfirm
        title={t("booking.worker.actions.cancelConfirm")}
        onConfirm={() => onAction(record._id, WorkerActionType.CANCEL)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Button size="small" danger>
          {t("booking.worker.actions.cancel")}
        </Button>
      </Popconfirm>
    ) : record.status === BookingStatus.PENDING ? (
      <Popconfirm
        title={t("booking.worker.actions.rejectConfirm")}
        onConfirm={() => onAction(record._id, WorkerActionType.REJECT)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Button size="small" danger>
          {t("booking.worker.actions.reject")}
        </Button>
      </Popconfirm>
    ) : null;

  return (
    <Space size="small" orientation="horizontal">
      {canConfirm && (
        <Popconfirm
          title={t("booking.worker.actions.confirmBooking")}
          onConfirm={() => onAction(record._id, WorkerActionType.CONFIRM)}
          okText={t("common.confirm")}
          cancelText={t("common.cancel")}
        >
          <Button type="primary" size="small">
            {t("booking.worker.actions.confirm")}
          </Button>
        </Popconfirm>
      )}
      {renderRejectOrCancel}
      {canStart && (
        <Popconfirm
          title={t("booking.worker.actions.startConfirm")}
          onConfirm={() => onAction(record._id, WorkerActionType.START)}
          okText={t("common.confirm")}
          cancelText={t("common.cancel")}
        >
          <Button type="primary" size="small">
            {t("booking.worker.actions.start")}
          </Button>
        </Popconfirm>
      )}
      {canComplete && (
        <Popconfirm
          title={t("booking.worker.actions.completeConfirm")}
          onConfirm={() => onAction(record._id, WorkerActionType.COMPLETE)}
          okText={t("common.confirm")}
          cancelText={t("common.cancel")}
        >
          <Button type="primary" size="small">
            {t("booking.worker.actions.complete")}
          </Button>
        </Popconfirm>
      )}
      {!canConfirm &&
        !renderRejectOrCancel &&
        !canStart &&
        !canComplete && (
          <Text type="secondary">
            {t("booking.worker.actions.noActionsAvailable")}
          </Text>
        )}
    </Space>
  );
}