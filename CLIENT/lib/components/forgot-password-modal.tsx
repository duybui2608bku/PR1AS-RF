"use client";

import { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Typography,
  message,
  Alert,
} from "antd";
import {
  MailOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useForgotPassword } from "@/lib/hooks/use-auth";
import type { ForgotPasswordRequest } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";

const { Text } = Typography;

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const { t } = useTranslation();
  const forgotPasswordMutation = useForgotPassword();
  const [forgotForm] = Form.useForm();
  const [isSuccess, setIsSuccess] = useState(false);
  const { handleError } = useErrorHandler();

  const handleForgotPassword = async (values: ForgotPasswordRequest) => {
    try {
      const response = await forgotPasswordMutation.mutateAsync(values);
      if (response.success) {
        setIsSuccess(true);
        message.success(t("auth.user.forgotPassword.emailSent"));
      }
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const handleClose = () => {
    forgotForm.resetFields();
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
      centered
      destroyOnHidden
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        {isSuccess ? (
          <CheckCircleOutlined
            style={{
              fontSize: 48,
              marginBottom: 16,
              color: "var(--ant-color-success)",
            }}
          />
        ) : (
          <SafetyOutlined
            style={{
              fontSize: 48,
              marginBottom: 16,
              color: "var(--ant-color-primary)",
            }}
          />
        )}
        <Typography.Title level={3}>
          {isSuccess
            ? t("auth.user.forgotPassword.emailSentTitle")
            : t("auth.user.forgotPassword.title")}
        </Typography.Title>
        <Text type="secondary">
          {isSuccess
            ? t("auth.user.forgotPassword.emailSentMessage")
            : t("auth.user.forgotPassword.subtitle")}
        </Text>
      </div>

      {isSuccess ? (
        <Alert
          message={t("auth.user.forgotPassword.checkEmail")}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Form
          form={forgotForm}
          name="forgot-password"
          onFinish={handleForgotPassword}
          autoComplete="off"
          layout="vertical"
          size="large"
          initialValues={{ email: initialEmail }}
        >
          <Form.Item
            name="email"
            label={t("auth.email.label")}
            rules={[
              { required: true, message: t("auth.email.required") },
              { type: "email", message: t("auth.email.invalid") },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t("auth.email.placeholder")}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={forgotPasswordMutation.isPending}
            >
              {t("auth.user.forgotPassword.sendResetLink")}
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}

