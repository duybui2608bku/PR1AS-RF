"use client";

import { Modal, Form, Select, Input } from "antd";
import { useTranslation } from "react-i18next";
import { CancellationReason } from "../constants/client-booking-constants";
import { JSX } from "react";

const { Option } = Select;

interface CancelBookingModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: {
    reason: CancellationReason;
    notes?: string;
  }) => Promise<void>;
}

export function CancelBookingModal({
  open,
  onCancel,
  onOk,
}: CancelBookingModalProps): JSX.Element {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleModalOk = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      await onOk(values);
      form.resetFields();
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        ("errorFields" in error || "errorInfo" in error)
      ) {
        return;
      }
    }
  };

  const handleModalCancel = (): void => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={t("booking.worker.actions.cancelTitle")}
      open={open}
      centered
      onOk={handleModalOk}
      onCancel={handleModalCancel}
      okText={t("common.confirm")}
      cancelText={t("common.cancel")}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={t("booking.cancel.reason")}
          rules={[
            {
              required: true,
              message: t("booking.cancel.reasonRequired"),
            },
          ]}
        >
          <Select placeholder={t("booking.cancel.selectReason")}>
            <Option value={CancellationReason.CLIENT_REQUEST}>
              {t("booking.cancel.reasons.clientRequest")}
            </Option>
            <Option value={CancellationReason.WORKER_UNAVAILABLE}>
              {t("booking.cancel.reasons.workerUnavailable")}
            </Option>
            <Option value={CancellationReason.SCHEDULE_CONFLICT}>
              {t("booking.cancel.reasons.scheduleConflict")}
            </Option>
            <Option value={CancellationReason.EMERGENCY}>
              {t("booking.cancel.reasons.emergency")}
            </Option>
            <Option value={CancellationReason.PAYMENT_FAILED}>
              {t("booking.cancel.reasons.paymentFailed")}
            </Option>
            <Option value={CancellationReason.POLICY_VIOLATION}>
              {t("booking.cancel.reasons.policyViolation")}
            </Option>
            <Option value={CancellationReason.OTHER}>
              {t("booking.cancel.reasons.other")}
            </Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="notes"
          label={t("booking.cancel.notes")}
          rules={[
            {
              max: 500,
              message: t("booking.cancel.notesMaxLength"),
            },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t("booking.cancel.notesPlaceholder")}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
