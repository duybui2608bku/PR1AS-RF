"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  Spin,
  Empty,
  Typography,
  Space,
  Divider,
  Descriptions,
} from "antd";
import { useTranslation } from "react-i18next";
import { bookingApi } from "@/lib/api/booking.api";
import type { Booking } from "@/lib/types/booking";
import { formatTime } from "@/lib/utils";
import styles from "../../chat.module.scss";

const { Text } = Typography;

const formatVnd = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

interface BookingParticipant {
  id: string;
  email?: string;
  full_name?: string;
}

interface BookingInfoPopoverProps {
  bookingId: string;
  isMobile: boolean;
  children: React.ReactNode;
}

export function BookingInfoPopover({
  bookingId,
  isMobile,
  children,
}: BookingInfoPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const {
    data: bookingData,
    isLoading: bookingLoading,
    isError: bookingError,
  } = useQuery<Booking>({
    queryKey: ["booking-details", bookingId],
    queryFn: () => bookingApi.getBookingById(bookingId),
    enabled: !!bookingId && open,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!bookingId) {
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

  const getParticipantDisplay = (value: string | BookingParticipant) => {
    if (typeof value === "string") {
      return value;
    }
    if (value.full_name) {
      return value.full_name;
    }
    if (value.email) {
      return value.email;
    }
    return value.id;
  };

  const renderContent = () => {
    if (bookingLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      );
    }

    if (bookingError || !bookingData) {
      return <Empty description="Không thể tải thông tin đặt chỗ" />;
    }

    return (
      <div className={styles.bookingInfoContent}>
        <Space
          orientation="vertical"
          size="middle"
          className={styles.bookingInfoSection}
        >
          <Text type="secondary">Thông tin đặt chỗ</Text>
          <Divider className={styles.bookingInfoDivider} />
          <Descriptions
            size="small"
            column={1}
            colon
            className={styles.bookingInfoDescriptions}
          >
            <Descriptions.Item label="Khách hàng">
              {getParticipantDisplay(
                bookingData.client_id as unknown as string | BookingParticipant,
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Người thực hiện">
              {getParticipantDisplay(
                bookingData.worker_id as unknown as string | BookingParticipant,
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider className={styles.bookingInfoDivider} />

          <Descriptions
            size="small"
            column={1}
            colon
            className={styles.bookingInfoDescriptions}
          >
            <Descriptions.Item label="Mã dịch vụ">
              {bookingData.service_code}
            </Descriptions.Item>
            <Descriptions.Item label="Giá">
              <Space orientation="vertical" size={2}>
                <Text>{formatVnd(bookingData.pricing.unit_price)}</Text>
                <Text type="secondary">
                  {bookingData.pricing.quantity} × {bookingData.pricing.unit}
                </Text>
                <Text strong>
                  {formatVnd(bookingData.pricing.total_amount)}
                </Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <Divider className={styles.bookingInfoDivider} />

          <Descriptions
            size="small"
            column={1}
            colon
            className={styles.bookingInfoDescriptions}
          >
            <Descriptions.Item label="Lịch làm việc">
              <Space orientation="vertical" size={2}>
                <Text>
                  {formatTime(bookingData.schedule.start_time, t)} đến{" "}
                  {formatTime(bookingData.schedule.end_time, t)}
                </Text>
                <Text type="secondary">
                  {bookingData.schedule.duration_hours} giờ
                </Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </div>
    );
  };

  return (
    <Popover
      content={renderContent()}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement={isMobile ? "bottom" : "bottomRight"}
      overlayClassName={styles.bookingPopoverOverlay}
      title="Chi tiết đặt chỗ"
    >
      {children}
    </Popover>
  );
}
