"use client";

import { Form, Input, Modal, Select, Typography } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DisputeReason } from "@/lib/types/booking";

const { TextArea } = Input;
const { Title } = Typography;

enum ComplaintFormField {
  REASON = "reason",
  DESCRIPTION = "description",
  EVIDENCE_URLS = "evidence_urls",
}

enum ComplaintValidationRule {
  MIN_DESCRIPTION_LENGTH = 10,
  MAX_DESCRIPTION_LENGTH = 2000,
}

interface ComplaintFormValues {
  reason: DisputeReason;
  description: string;
  evidence_urls?: string;
}

interface ComplaintModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: {
    reason: DisputeReason;
    description: string;
    evidenceUrls: string[];
  }) => Promise<void>;
  loading?: boolean;
}

const disputeReasonOptions = Object.values(DisputeReason).map((reason) => ({
  labelKey: `booking.complaint.reasons.${reason}`,
  value: reason,
}));

const parseEvidenceUrls = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);
};

export function ComplaintModal({
  open,
  onCancel,
  onOk,
  loading = false,
}: ComplaintModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ComplaintFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [form, open]);

  const handleModalOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onOk({
      reason: values.reason,
      description: values.description.trim(),
      evidenceUrls: parseEvidenceUrls(values.evidence_urls),
    });
  };

  const handleModalCancel = (): void => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={open}
      centered
      width={640}
      onOk={handleModalOk}
      onCancel={handleModalCancel}
      okText={t("booking.complaint.submit")}
      cancelText={t("common.cancel")}
      confirmLoading={loading}
      title={<Title level={4}>{t("booking.complaint.title")}</Title>}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name={ComplaintFormField.REASON}
          label={t("booking.complaint.reason")}
          rules={[
            {
              required: true,
              message: t("booking.complaint.reasonRequired"),
            },
          ]}
        >
          <Select
            placeholder={t("booking.complaint.reasonPlaceholder")}
            options={disputeReasonOptions.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
          />
        </Form.Item>

        <Form.Item
          name={ComplaintFormField.DESCRIPTION}
          label={t("booking.complaint.description")}
          rules={[
            {
              required: true,
              message: t("booking.complaint.descriptionRequired"),
            },
            {
              min: ComplaintValidationRule.MIN_DESCRIPTION_LENGTH,
              message: t("booking.complaint.descriptionMinLength"),
            },
            {
              max: ComplaintValidationRule.MAX_DESCRIPTION_LENGTH,
              message: t("booking.complaint.descriptionMaxLength"),
            },
          ]}
        >
          <TextArea
            rows={5}
            showCount
            maxLength={ComplaintValidationRule.MAX_DESCRIPTION_LENGTH}
            placeholder={t("booking.complaint.descriptionPlaceholder")}
          />
        </Form.Item>

        <Form.Item
          name={ComplaintFormField.EVIDENCE_URLS}
          label={t("booking.complaint.evidenceUrls")}
          extra={t("booking.complaint.evidenceUrlsHelp")}
        >
          <TextArea
            rows={3}
            placeholder={t("booking.complaint.evidenceUrlsPlaceholder")}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
