"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Form,
  DatePicker,
  TimePicker,
  Input,
  Typography,
  Space,
  Row,
  Col,
  Divider,
  message,
  Alert,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useApiMutation, useApiQueryData } from "@/lib/hooks/use-api";
import {
  CreateBookingInput,
  PricingUnit,
  BookingSchedule,
  BookingPricing,
} from "@/lib/types/booking";
import { BOOKING_CONSTANTS, BOOKING_TIME_SLOTS } from "@/lib/constants/booking";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import styles from "@/app/worker/components/BookingModal.module.scss";
import { type WalletBalanceResponse } from "@/lib/api/wallet.api";

const { Text, Title } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  workerId: string;
  workerServiceId: string;
  serviceId: string;
  serviceCode: string;
  clientId: string;
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
  clientId,
  pricing,
  onSuccess,
}: BookingModalProps) {
  const { t } = useI18n();
  const { currency } = useCurrency();
  const { handleError } = useErrorHandler();
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [selectedPricingUnit, setSelectedPricingUnit] = useState<PricingUnit>(
    PricingUnit.HOURLY
  );
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  useEffect(() => {
    if (!open || pricing.length === 0) {
      return;
    }
    const defaultUnit = (pricing[0].unit as PricingUnit) || PricingUnit.HOURLY;
    setSelectedPricingUnit(defaultUnit);
    setSelectedQuantity(1);
    setSelectedDate(null);
    setSelectedDateRange(null);
    form.setFieldsValue({
      booking_date: null,
      date_range: null,
      start_time: null,
    });
  }, [open, pricing, form]);

  const { data: walletBalance, isLoading: isLoadingWalletBalance } =
    useApiQueryData<WalletBalanceResponse>(
      ["wallet-balance"],
      "/wallet/balance",
      {
        enabled: open,
      }
    );

  const createBookingMutation = useApiMutation<unknown, CreateBookingInput>(
    "/bookings",
    "POST",
    {
      onSuccess: () => {
        message.success(t("booking.create.success"));
        form.resetFields();
        setSelectedDate(null);
        setSelectedDateRange(null);
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
    let quantity = selectedQuantity;

    if (selectedPricingUnit === PricingUnit.DAILY && selectedDateRange) {
      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        const daysDiff = endDate.diff(startDate, "day") + 1;
        quantity = Math.max(1, daysDiff);
      }
    }

    const subtotal = unitPrice * quantity;
    const platformFee =
      Math.round(
        ((subtotal * BOOKING_CONSTANTS.PLATFORM_FEE_PERCENT) / 100) * 100
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
  }, [
    selectedPricing,
    selectedQuantity,
    selectedPricingUnit,
    selectedDateRange,
    currency,
  ]);

  const hasInsufficientBalance = useMemo((): boolean => {
    if (!walletBalance || isLoadingWalletBalance) {
      return false;
    }
    return walletBalance.balance < calculatePricing.total_amount;
  }, [walletBalance, calculatePricing.total_amount, isLoadingWalletBalance]);

  const handleSubmit = async (): Promise<void> => {
    try {
      if (hasInsufficientBalance) {
        message.error(t("errors.wallet.insufficientBalance.message"));
        return;
      }

      const values = await form.validateFields();

      let startTime: Dayjs;
      let endTime: Dayjs;

      if (selectedPricingUnit === PricingUnit.DAILY) {
        if (
          !selectedDateRange ||
          !selectedDateRange[0] ||
          !selectedDateRange[1]
        ) {
          message.error(t("booking.create.selectDate"));
          return;
        }

        const [startDate, endDate] = selectedDateRange;
        startTime = startDate
          .startOf("day")
          .hour(BOOKING_TIME_SLOTS.START_HOUR)
          .minute(0)
          .second(0)
          .millisecond(0);
        endTime = endDate
          .endOf("day")
          .hour(BOOKING_TIME_SLOTS.END_HOUR)
          .minute(0)
          .second(0)
          .millisecond(0);
      } else {
        if (!values.booking_date) {
          message.error(t("booking.create.selectDate"));
          return;
        }

        startTime = values.booking_date
          .hour(values.start_time.hour())
          .minute(values.start_time.minute())
          .second(0)
          .millisecond(0);

        endTime = startTime.add(
          selectedQuantity * selectedPricing.duration,
          selectedPricingUnit === PricingUnit.HOURLY ? "hour" : "month"
        );
      }

      const durationMs = endTime.diff(startTime);
      const durationHours = durationMs / (1000 * 60 * 60);

      if (
        durationHours < BOOKING_CONSTANTS.MIN_DURATION_HOURS ||
        durationHours > BOOKING_CONSTANTS.MAX_DURATION_HOURS
      ) {
        message.error(t("booking.create.invalidDuration"));
        return;
      }

      const minAdvanceTime = dayjs().add(
        BOOKING_CONSTANTS.MIN_ADVANCE_HOURS,
        "hour"
      );
      if (startTime.isBefore(minAdvanceTime)) {
        message.error(
          t("booking.create.minAdvance", {
            hours: BOOKING_CONSTANTS.MIN_ADVANCE_HOURS,
          })
        );
        return;
      }

      const maxAdvanceTime = dayjs().add(
        BOOKING_CONSTANTS.MAX_ADVANCE_DAYS,
        "day"
      );
      if (startTime.isAfter(maxAdvanceTime)) {
        message.error(
          t("booking.create.maxAdvance", {
            days: BOOKING_CONSTANTS.MAX_ADVANCE_DAYS,
          })
        );
        return;
      }

      const schedule: BookingSchedule = {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: Math.round(durationHours * 10) / 10,
      };

      const bookingData: CreateBookingInput = {
        client_id: clientId,
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
      if (error instanceof Error && "errorFields" in error) {
        return;
      }
      handleError(error);
    }
  };

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

  const handleClose = (): void => {
    setSelectedDate(null);
    setSelectedDateRange(null);
    form.resetFields();
    onClose();
  };

  const handlePricingUnitChange = (unit: PricingUnit): void => {
    setSelectedPricingUnit(unit);
    setSelectedQuantity(1);
    setSelectedDate(null);
    setSelectedDateRange(null);
    form.setFieldsValue({
      booking_date: null,
      date_range: null,
      start_time: null,
    });
  };

  return (
    <Modal
    open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
    
      okText={t("booking.create.submit")}
      cancelText={t("common.cancel")}
      width={600}
      confirmLoading={createBookingMutation.isPending}
      title={t("booking.create.title")}
      okButtonProps={{
        disabled: hasInsufficientBalance || isLoadingWalletBalance,
      }}
    >
      <Form form={form} layout="vertical">
        {selectedPricingUnit === PricingUnit.DAILY ? (
          <Form.Item
            name="date_range"
            label={t("booking.create.dateRange")}
            rules={[
              {
                required: true,
                message: t("booking.create.dateRangeRequired"),
              },
            ]}
          >
            <RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder={[
                t("booking.create.selectStartDate"),
                t("booking.create.selectEndDate"),
              ]}
              disabledDate={(current) => {
                if (!current) return false;
                const today = dayjs().startOf("day");
                const minDate = today.add(
                  BOOKING_CONSTANTS.MIN_ADVANCE_HOURS,
                  "hour"
                );
                const maxDate = today.add(
                  BOOKING_CONSTANTS.MAX_ADVANCE_DAYS,
                  "day"
                );
                return (
                  current.isBefore(minDate, "day") ||
                  current.isAfter(maxDate, "day")
                );
              }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setSelectedDateRange([dates[0], dates[1]]);
                } else {
                  setSelectedDateRange(null);
                }
              }}
              value={selectedDateRange}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="booking_date"
              label={t("booking.create.date")}
              rules={[
                {
                  required: true,
                  message: t("booking.create.dateRequired"),
                },
              ]}
            >
              <DatePicker
                className={styles.fullWidth}
                format="DD/MM/YYYY"
                placeholder={t("booking.create.selectDate")}
                disabledDate={(current) => {
                  if (!current) return false;
                  const today = dayjs().startOf("day");
                  const minDate = today.add(
                    BOOKING_CONSTANTS.MIN_ADVANCE_HOURS,
                    "hour"
                  );
                  const maxDate = today.add(
                    BOOKING_CONSTANTS.MAX_ADVANCE_DAYS,
                    "day"
                  );
                  return (
                    current.isBefore(minDate, "day") ||
                    current.isAfter(maxDate, "day")
                  );
                }}
                onChange={(date) => {
                  setSelectedDate(date);
                }}
                value={selectedDate}
              />
            </Form.Item>

            <Form.Item
              name="start_time"
              label={t("booking.create.startTime")}
              dependencies={["booking_date"]}
              rules={[
                {
                  required: true,
                  message: t("booking.create.startTimeRequired"),
                },
              ]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={BOOKING_TIME_SLOTS.SLOT_DURATION_MINUTES}
                disabledTime={disabledTime}
                style={{ width: "100%" }}
                placeholder={t("booking.create.selectStartTime")}
              />
            </Form.Item>
          </>
        )}

        <Form.Item label={t("booking.create.pricingUnit")}>
          <Space>
            {pricing.map((p) => (
              <button
                key={p.unit}
                type="button"
                onClick={() => handlePricingUnitChange(p.unit as PricingUnit)}
                className={`${styles.pricingButton} ${selectedPricingUnit === p.unit ? styles.pricingButtonSelected : ""}`}
              >
                {p.unit === PricingUnit.HOURLY
                  ? t("booking.pricing.hourly")
                  : p.unit === PricingUnit.DAILY
                  ? t("booking.pricing.daily")
                  : t("booking.pricing.monthly")}
              </button>
            ))}
          </Space>
        </Form.Item>

        {selectedPricingUnit !== PricingUnit.DAILY && (
          <Form.Item label={t("booking.create.quantity")}>
            <Space>
              <button
                type="button"
                onClick={() =>
                  setSelectedQuantity((prev) => Math.max(1, prev - 1))
                }
                className={styles.quantityButton}
              >
                -
              </button>
              <Text strong>{selectedQuantity}</Text>
              <button
                type="button"
                onClick={() => setSelectedQuantity((prev) => prev + 1)}
                className={styles.quantityButton}
              >
                +
              </button>
            </Space>
          </Form.Item>
        )}

        {walletBalance && (
          <Form.Item label={t("wallet.title")}>
            <Alert
              title={
                <Space>
                  <Text>{t("wallet.cards.totalBalance")}:</Text>
                  <Text strong>{formatCurrency(walletBalance.balance)}</Text>
                </Space>
              }
              type={hasInsufficientBalance ? "error" : "info"}
              showIcon
            />
          </Form.Item>
        )}

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">{t("booking.pricing.subtotal")}</Text>
          </Col>
          <Col span={12} className={styles.summaryRowRight}>
            <Text>{formatCurrency(calculatePricing.subtotal)}</Text>
          </Col>
        </Row>

        <Row gutter={16} className={styles.summaryRow}>
          <Col span={12}>
            <Text type="secondary">{t("booking.pricing.platformFee")}</Text>
          </Col>
          <Col span={12} className={styles.summaryRowRight}>
            <Text>{formatCurrency(calculatePricing.platform_fee)}</Text>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Title level={5} className={styles.totalLabel}>
              {t("booking.pricing.total")}
            </Title>
          </Col>
          <Col span={12} className={styles.summaryRowRight}>
            <Title level={5} className={styles.totalValue}>
              {formatCurrency(calculatePricing.total_amount)}
            </Title>
          </Col>
        </Row>

        <Form.Item name="client_notes" label={t("booking.create.notes")}>
          <TextArea
            rows={4}
            placeholder={t("booking.create.notesPlaceholder")}
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
