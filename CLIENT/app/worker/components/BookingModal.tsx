"use client";

import { useState, useMemo } from "react";
import {
  Modal,
  Form,
  TimePicker,
  Input,
  Typography,
  Space,
  Row,
  Col,
  Divider,
  message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useApiMutation } from "@/lib/hooks/use-api";
import { bookingApi } from "@/lib/api/booking.api";
import type {
  CreateBookingInput,
  PricingUnit,
  BookingSchedule,
  BookingPricing,
} from "@/lib/types/booking";
import { BOOKING_CONSTANTS, BOOKING_TIME_SLOTS } from "@/lib/constants/booking";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  workerId: string;
  workerServiceId: string;
  serviceId: string;
  serviceCode: string;
  selectedDate: Dayjs | null;
  pricing: Array<{
    unit: string;
    duration: number;
    price: number;
    currency: string;
  }>;
  onSuccess?: () => void;
}

export function BookingModal({
  open,
  onClose,
  workerId,
  workerServiceId,
  serviceId,
  serviceCode,
  selectedDate,
  pricing,
  onSuccess,
}: BookingModalProps) {
  const { t } = useI18n();
  const { currency } = useCurrency();
  const { handleError } = useErrorHandler();
  const [form] = Form.useForm();
  const [selectedPricingUnit, setSelectedPricingUnit] = useState<PricingUnit>(
    PricingUnit.HOURLY
  );
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const createBookingMutation = useApiMutation<unknown, CreateBookingInput>(
    "/bookings",
    "POST",
    {
      onSuccess: () => {
        message.success(t("booking.create.success") || "Đặt lịch thành công");
        form.resetFields();
        onClose();
        onSuccess?.();
      },
      onError: (error) => {
        handleError(error);
      },
    }
  );

  const selectedPricing = useMemo(() => {
    return pricing.find((p) => p.unit === selectedPricingUnit) || pricing[0];
  }, [pricing, selectedPricingUnit]);

  const calculatePricing = useMemo((): BookingPricing => {
    if (!selectedPricing) {
      return {
        unit: PricingUnit.HOURLY,
        unit_price: 0,
        quantity: 1,
        subtotal: 0,
        platform_fee: 0,
        total_amount: 0,
        worker_payout: 0,
        currency: currency,
      };
    }

    const unitPrice = selectedPricing.price;
    const quantity = selectedQuantity;
    const subtotal = unitPrice * quantity;
    const platformFee =
      Math.round(
        (subtotal * BOOKING_CONSTANTS.PLATFORM_FEE_PERCENT) / 100 * 100
      ) / 100;
    const totalAmount = subtotal + platformFee;
    const workerPayout = subtotal - platformFee;

    return {
      unit: selectedPricingUnit,
      unit_price: unitPrice,
      quantity: quantity,
      subtotal: Math.round(subtotal * 100) / 100,
      platform_fee: platformFee,
      total_amount: Math.round(totalAmount * 100) / 100,
      worker_payout: Math.round(workerPayout * 100) / 100,
      currency: selectedPricing.currency || currency,
    };
  }, [selectedPricing, selectedQuantity, selectedPricingUnit, currency]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (!selectedDate) {
        message.error(t("booking.create.selectDate") || "Vui lòng chọn ngày");
        return;
      }

      const startTime = selectedDate
        .hour(values.start_time.hour())
        .minute(values.start_time.minute())
        .second(0)
        .millisecond(0);

      const endTime = startTime.add(
        selectedQuantity * selectedPricing.duration,
        selectedPricingUnit === PricingUnit.HOURLY
          ? "hour"
          : selectedPricingUnit === PricingUnit.DAILY
          ? "day"
          : "month"
      );

      const durationMs = endTime.diff(startTime);
      const durationHours = durationMs / (1000 * 60 * 60);

      if (
        durationHours < BOOKING_CONSTANTS.MIN_DURATION_HOURS ||
        durationHours > BOOKING_CONSTANTS.MAX_DURATION_HOURS
      ) {
        message.error(
          t("booking.create.invalidDuration") ||
            "Thời lượng không hợp lệ (1-24 giờ)"
        );
        return;
      }

      const minAdvanceTime = dayjs().add(
        BOOKING_CONSTANTS.MIN_ADVANCE_HOURS,
        "hour"
      );
      if (startTime.isBefore(minAdvanceTime)) {
        message.error(
          t("booking.create.minAdvance") ||
            `Phải đặt trước ít nhất ${BOOKING_CONSTANTS.MIN_ADVANCE_HOURS} giờ`
        );
        return;
      }

      const maxAdvanceTime = dayjs().add(
        BOOKING_CONSTANTS.MAX_ADVANCE_DAYS,
        "day"
      );
      if (startTime.isAfter(maxAdvanceTime)) {
        message.error(
          t("booking.create.maxAdvance") ||
            `Không thể đặt quá ${BOOKING_CONSTANTS.MAX_ADVANCE_DAYS} ngày`
        );
        return;
      }

      const schedule: BookingSchedule = {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: Math.round(durationHours * 10) / 10,
      };

      const bookingData: CreateBookingInput = {
        worker_id: workerId,
        worker_service_id: workerServiceId,
        service_id: serviceId,
        service_code: serviceCode,
        schedule,
        pricing: calculatePricing,
        client_notes: values.client_notes || "",
      };

      await createBookingMutation.mutateAsync(bookingData);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      handleError(error);
    }
  };

  const timeSlots = useMemo(() => {
    const slots: Dayjs[] = [];
    const start = dayjs().hour(BOOKING_TIME_SLOTS.START_HOUR).minute(0);
    const end = dayjs().hour(BOOKING_TIME_SLOTS.END_HOUR).minute(0);

    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      slots.push(current);
      current = current.add(
        BOOKING_TIME_SLOTS.SLOT_DURATION_MINUTES,
        "minute"
      );
    }
    return slots;
  }, []);

  const disabledTime = (): { disabledHours: () => number[] } => {
    return {
      disabledHours: () => {
        const hours: number[] = [];
        for (let i = 0; i < BOOKING_TIME_SLOTS.START_HOUR; i++) {
          hours.push(i);
        }
        for (let i = BOOKING_TIME_SLOTS.END_HOUR + 1; i < 24; i++) {
          hours.push(i);
        }
        return hours;
      },
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: calculatePricing.currency,
    }).format(amount);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t("booking.create.submit") || "Đặt lịch"}
      cancelText={t("common.cancel") || "Hủy"}
      width={600}
      confirmLoading={createBookingMutation.isPending}
      title={t("booking.create.title") || "Đặt lịch dịch vụ"}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t("booking.create.date") || "Ngày"}
          required
          tooltip={t("booking.create.dateTooltip") || "Ngày đã chọn"}
        >
          <Text strong>
            {selectedDate?.format("DD/MM/YYYY") || t("common.notSelected")}
          </Text>
        </Form.Item>

        <Form.Item
          name="start_time"
          label={t("booking.create.startTime") || "Giờ bắt đầu"}
          rules={[
            {
              required: true,
              message: t("booking.create.startTimeRequired") || "Vui lòng chọn giờ bắt đầu",
            },
          ]}
        >
          <TimePicker
            format="HH:mm"
            minuteStep={BOOKING_TIME_SLOTS.SLOT_DURATION_MINUTES}
            disabledTime={disabledTime}
            style={{ width: "100%" }}
            placeholder={t("booking.create.selectStartTime") || "Chọn giờ bắt đầu"}
          />
        </Form.Item>

        <Form.Item
          label={t("booking.create.pricingUnit") || "Đơn vị"}
        >
          <Space>
            {pricing.map((p) => (
              <button
                key={p.unit}
                type="button"
                onClick={() => {
                  setSelectedPricingUnit(p.unit as PricingUnit);
                  setSelectedQuantity(1);
                }}
                style={{
                  padding: "8px 16px",
                  border:
                    selectedPricingUnit === p.unit
                      ? "2px solid #1890ff"
                      : "1px solid #d9d9d9",
                  borderRadius: "4px",
                  background:
                    selectedPricingUnit === p.unit ? "#e6f7ff" : "white",
                  cursor: "pointer",
                }}
              >
                {p.unit === PricingUnit.HOURLY
                  ? t("booking.pricing.hourly") || "Giờ"
                  : p.unit === PricingUnit.DAILY
                  ? t("booking.pricing.daily") || "Ngày"
                  : t("booking.pricing.monthly") || "Tháng"}
              </button>
            ))}
          </Space>
        </Form.Item>

        <Form.Item
          label={t("booking.create.quantity") || "Số lượng"}
        >
          <Space>
            <button
              type="button"
              onClick={() =>
                setSelectedQuantity((prev) => Math.max(1, prev - 1))
              }
              style={{
                padding: "4px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              -
            </button>
            <Text strong>{selectedQuantity}</Text>
            <button
              type="button"
              onClick={() => setSelectedQuantity((prev) => prev + 1)}
              style={{
                padding: "4px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </Space>
        </Form.Item>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">
              {t("booking.pricing.subtotal") || "Tạm tính"}
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: "right" }}>
            <Text>{formatCurrency(calculatePricing.subtotal)}</Text>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 8 }}>
          <Col span={12}>
            <Text type="secondary">
              {t("booking.pricing.platformFee") || "Phí nền tảng"}
            </Text>
          </Col>
          <Col span={12} style={{ textAlign: "right" }}>
            <Text>{formatCurrency(calculatePricing.platform_fee)}</Text>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Title level={5} style={{ margin: 0 }}>
              {t("booking.pricing.total") || "Tổng cộng"}
            </Title>
          </Col>
          <Col span={12} style={{ textAlign: "right" }}>
            <Title level={5} style={{ margin: 0, color: "#1890ff" }}>
              {formatCurrency(calculatePricing.total_amount)}
            </Title>
          </Col>
        </Row>

        <Form.Item
          name="client_notes"
          label={t("booking.create.notes") || "Ghi chú"}
        >
          <TextArea
            rows={4}
            placeholder={t("booking.create.notesPlaceholder") || "Nhập ghi chú (tùy chọn)"}
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
