"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, message, Divider } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useLogin, useResendVerification } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { isEmailNotVerifiedError } from "@/lib/utils/auth-error.utils";
import { normalizeEmail } from "@/lib/utils/auth-input.utils";
import type { LoginRequest } from "@/lib/hooks/use-auth";
import styles from "../auth.module.scss";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const resendVerificationMutation = useResendVerification();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roles = Array.isArray(user.roles)
        ? user.roles
        : user.role
        ? [user.role]
        : [];

      if (roles.includes("admin")) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = useCallback(async (values: LoginRequest) => {
    try {
      setPendingVerificationEmail(null);
      const response = await loginMutation.mutateAsync(values);

      if (response.success && response.data) {
        const { user: loggedInUser } = response.data;

        const userRoles = (loggedInUser as { roles?: string[]; role?: string })
          .roles;
        const userRole = (loggedInUser as { roles?: string[]; role?: string })
          .role;

        const roles = Array.isArray(userRoles)
          ? userRoles
          : userRole
          ? [userRole]
          : [];

        message.success(t("auth.user.loginSuccess"));

        if (roles.includes("admin")) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (error: unknown) {
      if (isEmailNotVerifiedError(error)) {
        const normalizedEmail = normalizeEmail(values.email);
        setPendingVerificationEmail(normalizedEmail);
        message.warning(t("auth.user.verifyEmail.emailNotVerified"));
        return;
      }

      handleError(error, t("auth.user.loginError"));
    }
  }, [loginMutation, t, router, handleError]);

  const handleResendVerification = useCallback(async () => {
    if (!pendingVerificationEmail) {
      return;
    }

    try {
      await resendVerificationMutation.mutateAsync({
        email: pendingVerificationEmail,
      });
      message.success(t("auth.user.verifyEmail.resendSuccess"));
    } catch (error: unknown) {
      handleError(error);
    }
  }, [pendingVerificationEmail, resendVerificationMutation, t, handleError]);

  const handleValuesChange = useCallback(() => {
    if (pendingVerificationEmail) {
      setPendingVerificationEmail(null);
    }
  }, [pendingVerificationEmail]);

  return (
    <div className={styles.centerBlock}>
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <SafetyOutlined className={styles.heroIcon} />
          <Title level={2}>{t("auth.user.loginTitle")}</Title>
          <Text type="secondary">{t("auth.user.loginSubtitle")}</Text>
        </div>

        <Form
          form={form}
          name="user-login"
          onFinish={handleLogin}
          onValuesChange={handleValuesChange}
          autoComplete="off"
          layout="vertical"
          size="large"
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
              prefix={<UserOutlined />}
              placeholder={t("auth.email.placeholder")}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t("auth.password.label")}
            rules={[
              { required: true, message: t("auth.password.required") },
              { min: 8, message: t("auth.password.minLength") },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("auth.password.placeholder")}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
            >
              {t("auth.user.login")}
            </Button>
          </Form.Item>

          {pendingVerificationEmail ? (
            <Form.Item>
              <Text type="warning">
                {t("auth.user.verifyEmail.emailNotVerifiedHint")}
              </Text>
              <div>
                <Button
                  type="link"
                  style={{ paddingInline: 0 }}
                  loading={resendVerificationMutation.isPending}
                  onClick={handleResendVerification}
                >
                  {t("auth.user.verifyEmail.resendEmail")}
                </Button>
              </div>
            </Form.Item>
          ) : null}
        </Form>

        <Divider />

        <div className={styles.footerBlock}>
          <Text type="secondary">
            {t("auth.user.noAccount")}{" "}
            <Link href="/auth/register" className={styles.link}>
              {t("auth.user.register")}
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
