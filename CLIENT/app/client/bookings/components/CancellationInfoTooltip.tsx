"use client";

import { Tooltip, Space, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { TFunction } from "i18next";
import { formatDateTime } from "@/app/func/func";
import type { Booking } from "@/lib/types/booking";
import {
  getCancellationReasonLabel,
  getCancelledByLabel,
} from "@/lib/constants/booking";
import styles from "./CancellationInfoTooltip.module.scss";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

interface CancellationInfoTooltipProps {
  cancellation: NonNullable<Booking["cancellation"]>;
  t: TFunction;
  formatCurrency: FormatCurrencyFunction;
}

export function CancellationInfoTooltip({
  cancellation,
  t,
  formatCurrency,
}: CancellationInfoTooltipProps) {
  const cancelledByLabel = getCancelledByLabel(cancellation.cancelled_by, t);
  const reasonLabel = getCancellationReasonLabel(cancellation.reason, t);

  const tooltipContent = (
    <Space direction="vertical" size="small">
      <Text className={styles.tooltipText}>
        <Text strong className={styles.tooltipLabel}>
          {t("booking.cancellation.cancelledBy")}:
        </Text>{" "}
        {cancelledByLabel}
      </Text>
      <Text className={styles.tooltipText}>
        <Text strong className={styles.tooltipLabel}>
          {t("booking.cancellation.reason")}:
        </Text>{" "}
        {reasonLabel}
      </Text>
      {cancellation.notes && (
        <Text className={styles.tooltipText}>
          <Text strong className={styles.tooltipLabel}>
            {t("booking.cancellation.notes")}:
          </Text>{" "}
          {cancellation.notes}
        </Text>
      )}
      <Text className={styles.tooltipText}>
        <Text strong className={styles.tooltipLabel}>
          {t("booking.cancellation.cancelledAt")}:
        </Text>{" "}
        {formatDateTime(cancellation.cancelled_at)}
      </Text>
      {cancellation.refund_amount > 0 && (
        <Text className={styles.tooltipText}>
          <Text strong className={styles.tooltipLabel}>
            {t("booking.cancellation.refundAmount")}:
          </Text>{" "}
          {formatCurrency(cancellation.refund_amount)}
        </Text>
      )}
      {cancellation.penalty_amount > 0 && (
        <Text className={styles.tooltipText}>
          <Text strong className={styles.tooltipLabel}>
            {t("booking.cancellation.penaltyAmount")}:
          </Text>{" "}
          {formatCurrency(cancellation.penalty_amount)}
        </Text>
      )}
    </Space>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <InfoCircleOutlined className={styles.icon} />
    </Tooltip>
  );
}
