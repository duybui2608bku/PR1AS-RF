"use client";

import { Card, Row, Col, Space, Tag, Typography } from "antd";
import type { Escrow } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { FontSize, Spacing, ColSpan } from "@/lib/constants/ui.constants";
import { TagColor } from "@/lib/constants/theme.constants";
import type { TFunction } from "i18next";
import styles from "./EscrowCard.module.scss";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number, currency?: string) => string;

interface EscrowCardProps {
  escrow: Escrow;
  formatCurrency: FormatCurrencyFunction;
  t: TFunction;
}

function getStatusTagColor(status: EscrowStatus): string {
  const statusColorMap: Record<EscrowStatus, TagColor> = {
    [EscrowStatus.HOLDING]: TagColor.PROCESSING,
    [EscrowStatus.RELEASED]: TagColor.SUCCESS,
    [EscrowStatus.REFUNDED]: TagColor.ERROR,
    [EscrowStatus.PARTIALLY_RELEASED]: TagColor.WARNING,
    [EscrowStatus.DISPUTED]: TagColor.DEFAULT,
  };
  return statusColorMap[status] || TagColor.DEFAULT;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function getBookingId(bookingId: string | { _id: string }): string {
  return typeof bookingId === "string" ? bookingId : bookingId._id;
}

export function EscrowCard({
  escrow,
  formatCurrency,
  t,
}: EscrowCardProps): React.ReactElement {
  const bookingId = getBookingId(escrow.booking_id);
  const statusTagColor = getStatusTagColor(escrow.status);

  return (
    <Card size="small">
      <Row gutter={[0, Spacing.SM]}>
        <Col span={ColSpan.FULL}>
          <Space direction="vertical" size="small" className={styles.spaceFull}>
            <Space>
              <Text strong>{t("escrow.table.bookingId")}:</Text>
              <Text copyable={{ text: bookingId }}>{bookingId.slice(-8)}</Text>
            </Space>
            <Space>
              <Text>{t("escrow.table.status")}:</Text>
              <Tag color={statusTagColor}>
                {t(`escrow.status.${escrow.status}`) || escrow.status}
              </Tag>
            </Space>
          </Space>
        </Col>
        <Col span={ColSpan.FULL}>
          <Space direction="vertical" size="small" className={styles.spaceFull}>
            <Space>
              <Text>{t("escrow.table.amount")}:</Text>
              <Text strong className={styles.amountText}>
                {formatCurrency(escrow.amount)}
              </Text>
            </Space>
            <Space>
              <Text>{t("escrow.table.workerPayout")}:</Text>
              <Text>{formatCurrency(escrow.worker_payout)}</Text>
            </Space>
          </Space>
        </Col>
        <Col span={ColSpan.FULL}>
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <Space>
              <Text type="secondary" style={{ fontSize: FontSize.XS }}>
                {t("escrow.table.heldAt")}: {formatDate(escrow.held_at)}
              </Text>
            </Space>
            {escrow.released_at && (
              <Space>
                <Text type="secondary" style={{ fontSize: FontSize.XS }}>
                  {t("escrow.table.releasedAt")}: {formatDate(escrow.released_at)}
                </Text>
              </Space>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
