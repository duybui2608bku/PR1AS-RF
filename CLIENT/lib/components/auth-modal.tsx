"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Tabs,
  Typography,
} from "antd";
import {
  SafetyOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { normalizeEmail } from "@/lib/utils/auth-input.utils";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { LoginForm } from "./auth/login-form";
import { RegisterForm } from "./auth/register-form";

const { Text } = Typography;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");

  useEffect(() => {
    if (isAuthenticated && user && open) {
      onClose();
    }
  }, [isAuthenticated, user, open, onClose]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleClose = () => {
    onClose();
  };

  const handleForgotPassword = (email: string) => {
    setInitialEmail(normalizeEmail(email));
    setForgotPasswordModalOpen(true);
  };

  const tabItems = [
    {
      key: "login",
      label: t("auth.user.login"),
      children: <LoginForm onForgotPassword={handleForgotPassword} />,
    },
    {
      key: "register",
      label: t("auth.user.register"),
      children: <RegisterForm />,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterOpenChange={(isOpen) => {
        if (isOpen) {
          setActiveTab(defaultTab);
        }
      }}
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
        initialEmail={initialEmail}
      />
    </Modal>
  );
}

