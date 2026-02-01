"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Divider,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRegister } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PasswordStrength, validatePasswordComplexity } from "@/lib/components/password-strength";
import type { RegisterRequest } from "@/lib/hooks/use-auth";
import styles from "../auth.module.scss";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const registerMutation = useRegister();
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

  const handleRegister = async (
    values: RegisterRequest & { confirmPassword?: string }
  ) => {
    try {
      const { confirmPassword, ...registerData } = values;
      const response = await registerMutation.mutateAsync(registerData);

      if (response.success && response.data) {
        const { user: registeredUser } = response.data;

        message.success(t("auth.user.registerSuccess"));

        const userRoles = (
          registeredUser as { roles?: string[]; role?: string }
        ).roles;
        const userRole = (registeredUser as { roles?: string[]; role?: string })
          .role;

        const roles = Array.isArray(userRoles)
          ? userRoles
          : userRole
          ? [userRole]
          : [];

        if (roles.includes("admin")) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (error: unknown) {
      message.error(t("auth.user.registerError"));
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
      <Card style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <SafetyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Title level={2}>{t("auth.user.registerTitle")}</Title>
            <Text type="secondary">{t("auth.user.registerSubtitle")}</Text>
          </div>

          <Form
            form={form}
            name="user-register"
            onFinish={handleRegister}
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
                prefix={<MailOutlined />}
                placeholder={t("auth.email.placeholder")}
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="full_name"
              label={t("auth.user.fullName.label")}
              rules={[
                {
                  required: false,
                  message: t("auth.user.fullName.required"),
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("auth.user.fullName.placeholder")}
                autoComplete="name"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              label={t("auth.user.phone.label")}
              rules={[
                {
                  required: false,
                  message: t("auth.user.phone.required"),
                },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder={t("auth.user.phone.placeholder")}
                autoComplete="tel"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t("auth.password.label")}
              rules={[
                { required: true, message: t("auth.password.required") },
                { min: 8, message: t("auth.password.minLength") },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    if (validatePasswordComplexity(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(t("auth.password.complexity"))
                    );
                  },
                },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("auth.password.placeholder")}
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.password !== currentValues.password}>
              {({ getFieldValue }) => {
                const password = getFieldValue("password");
                return password ? <PasswordStrength password={password} /> : null;
              }}
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
                loading={registerMutation.isPending}
              >
                {t("auth.user.register")}
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <div className={styles.footerBlock}>
            <Text type="secondary">
              {t("auth.user.haveAccount")}{" "}
              <Link href="/auth/login" className={styles.link}>
                {t("auth.user.login")}
              </Link>
            </Text>
          </div>
        </Card>
    </div>
  );
}
