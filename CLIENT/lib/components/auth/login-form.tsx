"use client";

import { Form, Input, Button } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLogin, LoginRequest } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { message } from "antd";

interface LoginFormProps {
  onForgotPassword: (email: string) => void;
}

export const LoginForm = ({ onForgotPassword }: LoginFormProps) => {
  const { t } = useTranslation();
  const loginMutation = useLogin();
  const { handleError } = useErrorHandler();
  const [form] = Form.useForm();

  const handleLogin = async (values: LoginRequest) => {
    try {
      const response = await loginMutation.mutateAsync(values);

      if (response.success && response.data) {
        message.success(t("auth.user.loginSuccess"));
      }
    } catch (error: unknown) {
      handleError(error);
    }
  };

  return (
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

      <Form.Item style={{ marginBottom: 16 }}>
        <Button
          type="link"
          onClick={() => {
            const email = form.getFieldValue("email");
            onForgotPassword(email);
          }}
          style={{ padding: 0 }}
        >
          {t("auth.user.forgotPassword.link")}
        </Button>
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
  );
};
