"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, message, Divider } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useLogin } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { LoginRequest } from "@/lib/hooks/use-auth";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const [form] = Form.useForm();
  const { t } = useTranslation();

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

  const handleLogin = async (values: LoginRequest) => {
    try {
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
      message.error(t("auth.user.loginError"));
    }
  };

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
          <SafetyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Title level={2}>{t("auth.user.loginTitle")}</Title>
          <Text type="secondary">{t("auth.user.loginSubtitle")}</Text>
        </div>

        <Form
          form={form}
          name="user-login"
          onFinish={handleLogin}
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
        </Form>

        <Divider />

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            {t("auth.user.noAccount")}{" "}
            <Link href="/auth/register" style={{ fontWeight: 500 }}>
              {t("auth.user.register")}
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
