"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Typography,
  message,
  Divider,
  Row,
  Col,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLogin, useRegister } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { LoginRequest, RegisterRequest } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { ForgotPasswordModal } from "./forgot-password-modal";

const { Text } = Typography;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    if (isAuthenticated && user && open) {
      onClose();
      loginForm.resetFields();
      registerForm.resetFields();
    }
  }, [isAuthenticated, user, open, onClose, loginForm, registerForm]);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === "login") {
      registerForm.resetFields();
    } else {
      loginForm.resetFields();
    }
  };

  const handleClose = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    onClose();
  };

  const tabItems = [
    {
      key: "login",
      label: t("auth.user.login"),
      children: (
        <Form
          form={loginForm}
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
                const email = loginForm.getFieldValue("email");
                setForgotPasswordModalOpen(true);
                if (email) {
                  // Email sẽ được truyền vào modal
                }
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
      ),
    },
    {
      key: "register",
      label: t("auth.user.register"),
      children: (
        <Form
          form={registerForm}
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
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={activeTab === "register" ? 640 : 480}
      centered
      destroyOnHidden
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <SafetyOutlined style={{ fontSize: 48, marginBottom: 16, color: "var(--ant-color-primary)" }} />
        <Typography.Title level={3}>
          {activeTab === "login" ? t("auth.user.loginTitle") : t("auth.user.registerTitle")}
        </Typography.Title>
        <Text type="secondary">
          {activeTab === "login" ? t("auth.user.loginSubtitle") : t("auth.user.registerSubtitle")}
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        centered
      />

      <ForgotPasswordModal
        open={forgotPasswordModalOpen}
        onClose={() => setForgotPasswordModalOpen(false)}
        initialEmail={loginForm.getFieldValue("email") || ""}
      />
    </Modal>
  );
}

