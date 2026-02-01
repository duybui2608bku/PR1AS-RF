  "use client";

  import { Card, Row, Col, Space, Tag, Typography } from "antd";
  import type { Booking } from "@/lib/types/booking";
  import type { Service } from "@/lib/types/worker";
  import { formatDateTime } from "@/app/func/func";
  import { getServiceName } from "@/lib/utils/worker.utils";
import {
  getBookingStatusTagColor,
  getPaymentStatusTagColor,
  getClientName,
  WorkerActionType,
} from "@/app/worker/bookings/constants/booking.constants";
import { WorkerBookingActions } from "@/app/worker/bookings/components/WorkerBookingActions";
import { Spacing } from "@/lib/constants/ui.constants";
import type { TFunction } from "i18next";
import styles from "@/app/worker/bookings/components/WorkerBookingCard.module.scss";

  const { Text } = Typography;

  enum ColSpan {
    FULL = 24,
    HALF = 12,
  }

  type FormatCurrencyFunction = (amount: number) => string;

  interface WorkerBookingCardProps {
    booking: Booking;
    onAction: (
      bookingId: string,
      action: WorkerActionType,
      workerResponse?: string
    ) => void;
    formatCurrency: FormatCurrencyFunction;
    serviceMap: Map<string, Service>;
    locale: string;
    t: TFunction;
  }

  export function WorkerBookingCard({
    booking,
    onAction,
    formatCurrency,
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

    return (
      <Card size="small"
      actions={[<WorkerBookingActions
        record={booking}
        onAction={onAction}
        t={t}
      />]}
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
              <Text>{t("booking.table.paymentStatus")}:</Text>
                <Tag color={getPaymentStatusTagColor(booking.payment_status)}>
                  {t(`booking.paymentStatus.${booking.payment_status}`)}
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
          <Col xs={ColSpan.FULL} sm={ColSpan.HALF}>
            <Text strong className={styles.primaryAmount}>
              {formatCurrency(booking.pricing.total_amount)}
            </Text>
          </Col>
          <Col xs={ColSpan.FULL} sm={ColSpan.HALF}>
            <Text type="secondary" className={styles.payoutText}>
              {t("booking.worker.payout")}:{" "}
              {formatCurrency(booking.pricing.worker_payout)}
            </Text>
          </Col>
        </Row>
      </Card>
    );
  }
