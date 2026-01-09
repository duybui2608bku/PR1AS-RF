"use client";

import { useEffect } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Button,
  Space,
  message,
} from "antd";
import { WalletOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { walletApi } from "@/lib/api/wallet.api";
import { WALLET_LIMITS, DEPOSIT_AMOUNT_PRESETS } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";

interface DepositFormValues {
  amount: number;
}

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

export function DepositModal({ open, onClose }: DepositModalProps): JSX.Element {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [form] = Form.useForm<DepositFormValues>();

  const createDepositMutation = useMutation({
    mutationFn: walletApi.createDeposit,
    onSuccess: (data) => {
      message.success(t("wallet.deposit.success"));
      form.resetFields();
      onClose();
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: () => {
      message.error(t("wallet.deposit.error"));
    },
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async (values: DepositFormValues): Promise<void> => {
    await createDepositMutation.mutateAsync({ amount: values.amount });
  };

  const handlePresetClick = (amount: number): void => {
    form.setFieldsValue({ amount });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("wallet.deposit.title")}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="amount"
          label={t("wallet.deposit.amount.label")}
          rules={[
            {
              required: true,
              message: t("wallet.deposit.amount.required"),
            },
            {
              type: "number",
              min: WALLET_LIMITS.MIN_DEPOSIT_AMOUNT,
              message: t("wallet.deposit.amount.min", {
                amount: formatCurrency(WALLET_LIMITS.MIN_DEPOSIT_AMOUNT),
              }),
            },
            {
              type: "number",
              max: WALLET_LIMITS.MAX_DEPOSIT_AMOUNT,
              message: t("wallet.deposit.amount.max", {
                amount: formatCurrency(WALLET_LIMITS.MAX_DEPOSIT_AMOUNT),
              }),
            },
          ]}
        >
          <InputNumber<number>
            style={{ width: "100%" }}
            placeholder={t("wallet.deposit.amount.placeholder")}
            min={WALLET_LIMITS.MIN_DEPOSIT_AMOUNT}
            max={WALLET_LIMITS.MAX_DEPOSIT_AMOUNT}
            formatter={(value) =>
              value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
            }
            parser={(value) => {
              if (!value) return WALLET_LIMITS.MIN_DEPOSIT_AMOUNT;
              const parsed = value.replace(/\$\s?|(,*)/g, "");
              const num = Number.parseInt(parsed, 10);
              if (Number.isNaN(num)) return WALLET_LIMITS.MIN_DEPOSIT_AMOUNT;
              return num;
            }}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <span>{t("wallet.deposit.presets")}</span>
            <Space wrap>
              {DEPOSIT_AMOUNT_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  type="default"
                >
                  {formatCurrency(preset)}
                </Button>
              ))}
            </Space>
          </Space>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<WalletOutlined />}
            size="large"
            block
            loading={createDepositMutation.isPending}
          >
            {createDepositMutation.isPending
              ? t("wallet.deposit.processing")
              : t("wallet.deposit.submit")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
