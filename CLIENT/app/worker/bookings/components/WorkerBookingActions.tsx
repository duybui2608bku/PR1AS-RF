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
  onOpenComplaintChat?: (bookingId: string) => void;
  t: TFunction;
}

export function getWorkerBookingActionNodes({
  record,
  onAction,
  onOpenComplaintChat,
  t,
}: WorkerBookingActionsProps): React.ReactNode[] {
  const scheduleExpired = expireDate(record.schedule.start_time);
  if (scheduleExpired && record.status !== BookingStatus.DISPUTED) {
    return [
      <Button key="expired" size="small" disabled>
        {t("booking.worker.actions.expired")}
      </Button>,
    ];
  }

  const canConfirm = record.status === BookingStatus.PENDING;
  const canStart =
    record.status === BookingStatus.CONFIRMED &&
    record.payment_status === BookingPaymentStatus.PAID;
  const canComplete = record.status === BookingStatus.IN_PROGRESS;
  const canOpenComplaintChat = record.status === BookingStatus.DISPUTED;

  const rejectOrCancelNode =
    record.status === BookingStatus.CONFIRMED ? (
      <Popconfirm
        key="cancel"
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
        key="reject"
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

  const nodes: React.ReactNode[] = [];
  if (canConfirm) {
    nodes.push(
      <Popconfirm
        key="confirm"
        title={t("booking.worker.actions.confirmBooking")}
        onConfirm={() => onAction(record._id, WorkerActionType.CONFIRM)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Button type="primary" size="small">
          {t("booking.worker.actions.confirm")}
        </Button>
      </Popconfirm>
    );
  }
  if (rejectOrCancelNode) {
    nodes.push(rejectOrCancelNode);
  }
  if (canStart) {
    nodes.push(
      <Popconfirm
        key="start"
        title={t("booking.worker.actions.startConfirm")}
        onConfirm={() => onAction(record._id, WorkerActionType.START)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Button type="primary" size="small">
          {t("booking.worker.actions.start")}
        </Button>
      </Popconfirm>
    );
  }
  if (canComplete) {
    nodes.push(
      <Popconfirm
        key="complete"
        title={t("booking.worker.actions.completeConfirm")}
        onConfirm={() => onAction(record._id, WorkerActionType.COMPLETE)}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <Button type="primary" size="small">
          {t("booking.worker.actions.complete")}
        </Button>
      </Popconfirm>
    );
  }
  if (canOpenComplaintChat) {
    nodes.push(
      <Button
        key="complaint-chat"
        type="primary"
        size="small"
        onClick={() => onOpenComplaintChat?.(record._id)}
        disabled={!onOpenComplaintChat}
      >
        {t("booking.client.actions.openComplaintChat")}
      </Button>
    );
  }
  if (nodes.length === 0) {
    nodes.push(
      <Text key="no-actions" type="secondary">
        {t("booking.worker.actions.noActionsAvailable")}
      </Text>
    );
  }
  return nodes;
}

export function WorkerBookingActions(
  props: WorkerBookingActionsProps
): React.ReactElement {
  const nodes = getWorkerBookingActionNodes(props);
  return (
    <Space size="small" orientation="horizontal">
      {nodes}
    </Space>
  );
}