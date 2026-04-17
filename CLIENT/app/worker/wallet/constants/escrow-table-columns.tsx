import type { ColumnsType } from "antd/es/table";
import { Tag, Typography } from "antd";
import type { TFunction } from "i18next";
import type { Escrow } from "@/lib/types/escrow";
import { EscrowStatus } from "@/lib/types/escrow";
import { TagColor } from "@/lib/constants/theme.constants";

const { Text } = Typography;

type FormatCurrencyFunction = (amount: number) => string;

function getStatusTagColor(status: EscrowStatus): TagColor {
  const statusColorMap: Record<EscrowStatus, TagColor> = {
    [EscrowStatus.HOLDING]: TagColor.PROCESSING,
    [EscrowStatus.RELEASED]: TagColor.SUCCESS,
    [EscrowStatus.REFUNDED]: TagColor.ERROR,
    [EscrowStatus.PARTIALLY_RELEASED]: TagColor.WARNING,
    [EscrowStatus.DISPUTED]: TagColor.DEFAULT,
  };
  return statusColorMap[status] || TagColor.DEFAULT;
}

function getStatusLabel(status: EscrowStatus, t: TFunction): string {
  const statusLabelMap: Record<EscrowStatus, string> = {
    [EscrowStatus.HOLDING]: t("escrow.status.holding") || "Holding",
    [EscrowStatus.RELEASED]: t("escrow.status.released") || "Released",
    [EscrowStatus.REFUNDED]: t("escrow.status.refunded") || "Refunded",
    [EscrowStatus.PARTIALLY_RELEASED]:
      t("escrow.status.partiallyReleased") || "Partially Released",
    [EscrowStatus.DISPUTED]: t("escrow.status.disputed") || "Disputed",
  };
  return statusLabelMap[status] || status;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function buildEscrowColumns(
  t: TFunction,
  formatCurrency: FormatCurrencyFunction
): ColumnsType<Escrow> {
  return [
    {
      title: t("escrow.table.bookingId") || "Booking ID",
      dataIndex: "booking_id",
      key: "booking_id",
      render: (bookingId: string | { _id: string }) => {
        const id = typeof bookingId === "string" ? bookingId : bookingId._id;
        return <Text copyable={{ text: id }}>{id.slice(-8)}</Text>;
      },
    },
    {
      title: t("escrow.table.amount") || "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: t("escrow.table.workerPayout") || "Worker Payout",
      dataIndex: "worker_payout",
      key: "worker_payout",
      render: (payout: number) => formatCurrency(payout),
    },
    {
      title: t("escrow.table.status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (status: EscrowStatus) => (
        <Tag color={getStatusTagColor(status)}>{getStatusLabel(status, t)}</Tag>
      ),
    },
    {
      title: t("escrow.table.heldAt") || "Held At",
      dataIndex: "held_at",
      key: "held_at",
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t("escrow.table.releasedAt") || "Released At",
      dataIndex: "released_at",
      key: "released_at",
      render: (value: string | null) => formatDateTime(value),
    },
  ];
}
