"use client";

import { Form, Input, Button, Row, Col } from "antd";
import { MailOutlined, PhoneOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useRegister, RegisterRequest } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { message } from "antd";

export const RegisterForm = () => {
  const { t } = useTranslation();
  const registerMutation = useRegister();
  const { handleError } = useErrorHandler();
  const [form] = Form.useForm();

  const handleRegister = async (values: RegisterRequest & { confirmPassword?: string }) => {
    try {
      const { confirmPassword, ...registerData } = values;
      const response = await registerMutation.mutateAsync(registerData);

      if (response.success && response.data) {
        message.success(t("auth.user.registerSuccess"));
      }
    } catch (error: unknown) {
      handleError(error);
    }
  };

  return (
    <Form
      form={form}
      name="user-register"
      onFinish={handleRegister}
      autoComplete="off"
      layout="vertical"
      size="large"
    >
      <Row gutter={16}>
        <Col xs={24} sm={12}>
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
        </Col>

        <Col xs={24} sm={12}>
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
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
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
        </Col>

        <Col xs={24} sm={12}>
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
        </Col>
      </Row>

      <Form.Item
        name="confirmPassword"
        label={t("auth.user.confirmPassword.label")}
        dependencies={["password"]}
        rules={[
          { required: true, message: t("auth.user.confirmPassword.required") },
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
  );
};
