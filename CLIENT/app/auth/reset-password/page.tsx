"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Divider,
  Alert,
  Spin,
} from "antd";
import { LockOutlined, SafetyOutlined, CheckCircleOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useResetPassword } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { ResetPasswordRequest } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";

const { Title, Text } = Typography;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const resetPasswordMutation = useResetPassword();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [token, setToken] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const tokenParam = searchParams?.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      form.setFieldsValue({ token: tokenParam });
    }
  }, [searchParams, form]);

  const handleResetPassword = async (
    values: ResetPasswordRequest & { confirmPassword?: string }
  ) => {
    try {
      const { confirmPassword, ...resetData } = values;
      const response = await resetPasswordMutation.mutateAsync(resetData);

      if (response.success) {
        message.success(t("auth.user.forgotPassword.resetSuccess"));
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch (error: unknown) {
      handleError(error);
    }
  };

  if (isSuccess) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <Card style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <CheckCircleOutlined
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                  color: "var(--ant-color-success)",
                }}
              />
              <Title level={2}>{t("auth.user.forgotPassword.resetSuccess")}</Title>
              <Text type="secondary">
                {t("auth.user.forgotPassword.redirecting")}
              </Text>
            </div>
          </Card>
        </div>
      );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <SafetyOutlined
              style={{
                fontSize: 48,
                marginBottom: 16,
                color: "var(--ant-color-primary)",
              }}
            />
            <Title level={2}>{t("auth.user.forgotPassword.resetTitle")}</Title>
            <Text type="secondary">
              {t("auth.user.forgotPassword.resetSubtitle")}
            </Text>
          </div>

          {!token && (
            <Alert
              message={t("auth.user.forgotPassword.noToken")}
              type="warning"
              style={{ marginBottom: 24 }}
              showIcon
            />
          )}

          <Form
            form={form}
            name="reset-password"
            onFinish={handleResetPassword}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="token"
              label={t("auth.user.forgotPassword.resetToken.label")}
              rules={[
                {
                  required: true,
                  message: t("auth.user.forgotPassword.resetToken.required"),
                },
              ]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder={t("auth.user.forgotPassword.resetToken.placeholder")}
                disabled={!!token}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t("auth.password.label")}
              rules={[
                { required: true, message: t("auth.password.required") },
                { min: 8, message: t("auth.password.minLength") },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("auth.password.placeholder")}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={t("auth.user.confirmPassword.label")}
              dependencies={["password"]}
              rules={[
                {
                  required: true,
                  message: t("auth.user.confirmPassword.required"),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(t("auth.user.confirmPassword.notMatch"))
                    );
                  },
                }),
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("auth.user.confirmPassword.placeholder")}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={resetPasswordMutation.isPending}
              >
                {t("auth.user.forgotPassword.resetPassword")}
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <div style={{ textAlign: "center" }}>
            <Text type="secondary">
              <Link href="/auth/login" style={{ fontWeight: 500 }}>
                {t("auth.user.forgotPassword.backToLogin")}
              </Link>
            </Text>
          </div>
        </Card>
      </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
