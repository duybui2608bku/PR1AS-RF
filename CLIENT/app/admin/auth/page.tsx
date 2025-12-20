"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, message, Space } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLogin } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import type { LoginRequest } from "@/lib/hooks/use-auth";

const { Title, Text } = Typography;

/**
 * Trang đăng nhập Admin
 * Route: /admin/auth
 */
export default function AdminAuthPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  // Redirect nếu đã đăng nhập và là admin
  useEffect(() => {
    if (isAuthenticated && user) {
      // Kiểm tra nếu user có role admin
      // Backend trả về roles là mảng, nhưng có thể có role là string
      const roles = Array.isArray(user.roles)
        ? user.roles
        : user.role
        ? [user.role]
        : [];

      if (roles.includes("admin")) {
        router.push("/admin");
      } else {
        // Nếu không phải admin, redirect về trang chủ
        router.push("/");
      }
    }
  }, [isAuthenticated, user, router]);

  /**
   * Xử lý đăng nhập
   */
  const handleLogin = async (values: LoginRequest) => {
    try {
      const response = await loginMutation.mutateAsync(values);

      if (response.success && response.data) {
        const { user: loggedInUser } = response.data;

        // Kiểm tra role admin
        // Backend trả về roles là mảng, nhưng có thể có role là string
        const userRoles = (loggedInUser as { roles?: string[]; role?: string })
          .roles;
        const userRole = (loggedInUser as { roles?: string[]; role?: string })
          .role;

        const roles = Array.isArray(userRoles)
          ? userRoles
          : userRole
          ? [userRole]
          : [];

        if (roles.includes("admin")) {
          message.success(t("auth.loginSuccess"));
          router.push("/admin");
        } else {
          message.error(t("auth.loginError"));
          useAuthStore.getState().logout();
        }
      }
    } catch (error: unknown) {
      // Error đã được xử lý bởi axios interceptor và error handler
      console.error("Login error:", error);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "20px" }}>
      {/* Header với theme toggle và language switcher */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Space>
          <ThemeToggle />
          <LanguageSwitcher />
        </Space>
      </div>

      {/* Form đăng nhập */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <SafetyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Title level={2}>{t("auth.title")}</Title>
          <Text type="secondary">{t("auth.subtitle")}</Text>
        </div>

        <Form
          form={form}
          name="admin-login"
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
              {t("auth.login")}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Text type="secondary">{t("auth.forAdminOnly")}</Text>
        </div>
      </Card>
      </div>
    </div>
  );
}
