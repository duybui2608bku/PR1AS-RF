"use client";

import { Card, Row, Col, Space, Tag, Typography } from "antd";
import type { Booking } from "@/lib/types/booking";
import type { Service } from "@/lib/types/worker";
import { formatDateTime } from "@/app/func/func";
import { getServiceName } from "@/lib/utils/worker.utils";
import {
  getClientName,
  WorkerActionType,
} from "@/app/worker/bookings/constants/booking.constants";
import { getWorkerBookingActionNodes } from "@/app/worker/bookings/components/WorkerBookingActions";
import { Spacing } from "@/lib/constants/ui.constants";
import type { TFunction } from "i18next";
import styles from "@/app/worker/bookings/components/WorkerBookingCard.module.scss";
import { getBookingStatusTagColor } from "@/lib/constants/booking";

const { Text } = Typography;

enum ColSpan {
  FULL = 24,
}

interface WorkerBookingCardProps {
  booking: Booking;
  onAction: (
    bookingId: string,
    action: WorkerActionType,
    workerResponse?: string
  ) => void;
  onOpenComplaintChat?: (bookingId: string) => void;
  serviceMap: Map<string, Service>;
  locale: string;
  t: TFunction;
}

export function WorkerBookingCard({
  booking,
  onAction,
  onOpenComplaintChat,
  serviceMap,
  locale,
  t,
}: WorkerBookingCardProps): React.ReactElement {
  const serviceName = getServiceName({
    serviceCode: booking.service_code,
    serviceMap,
    locale,
  });
  const clientName = getClientName(booking);
  const cardActions = getWorkerBookingActionNodes({
    record: booking,
    onAction,
    onOpenComplaintChat,
    t,
  });

  return (
    <Card
      size="small"
      actions={cardActions.length > 0 ? cardActions : undefined}
    >
      <Row gutter={[0, Spacing.SM]}>
        <Col span={ColSpan.FULL}>
          <Space orientation="vertical">
            <Space>
              <Text>{t("booking.table.status")}:</Text>
              <Tag color={getBookingStatusTagColor(booking.status)}>
                {t(`booking.status.${booking.status}`)}
              </Tag>
            </Space>
            <Space>
              <Text>{t("booking.table.createdAt")}:</Text>
              <Text type="secondary" className={styles.secondaryText}>
                {formatDateTime(booking.created_at)}
              </Text>
            </Space>
          </Space>
        </Col>
        <Col span={ColSpan.FULL}>
          <Text strong>{serviceName}</Text>
        </Col>
        <Col span={ColSpan.FULL}>
          <Text>
            {t("booking.table.clientName")}: {clientName}
          </Text>
        </Col>
        <Col span={ColSpan.FULL}>
          <Text>
            {t("booking.table.startTime")}:{" "}
            {formatDateTime(booking.schedule.start_time)}
          </Text>
        </Col>
        <Col span={ColSpan.FULL}>
          <Text type="secondary" className={styles.secondaryText}>
            {t("booking.table.duration")}: {booking.schedule.duration_hours}{" "}
            {t("booking.pricing.hourly")}
          </Text>
        </Col>
      </Row>
    </Card>
  );
}
