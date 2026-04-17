"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Result,
} from "antd";
import {
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useVerifyEmail, useResendVerification } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import styles from "../auth.module.scss";

const { Title, Text } = Typography;

type VerifyStatus = "loading" | "success" | "error" | "no-token";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyEmailMutation = useVerifyEmail();
  const resendMutation = useResendVerification();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [resendForm] = Form.useForm();
  const [hasVerified, setHasVerified] = useState(false);

  const doVerify = useCallback(
    async (token: string) => {
      try {
        const response = await verifyEmailMutation.mutateAsync({ token });
        if (response.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error: unknown) {
        handleError(error);
        setStatus("error");
      }
    },
    [handleError, verifyEmailMutation]
  );

  useEffect(() => {
    if (hasVerified) return;

    const token = searchParams?.get("token");
    if (token) {
      setHasVerified(true);
      doVerify(token);
    } else {
      setStatus("no-token");
    }
  }, [searchParams, doVerify, hasVerified]);

  const handleResend = async (values: { email: string }) => {
    try {
      await resendMutation.mutateAsync({ email: values.email });
      message.success(t("auth.user.verifyEmail.resendSuccess"));
    } catch (error: unknown) {
      handleError(error);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className={styles.centerBlock}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <LoadingOutlined className={styles.heroIconPrimary} />
            <Title level={2}>{t("auth.user.verifyEmail.title")}</Title>
            <Text type="secondary">
              {t("auth.user.verifyEmail.verifying")}
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className={styles.centerBlock}>
        <Card className={styles.card}>
          <Result
            icon={
              <CheckCircleOutlined className={styles.resultSuccessIcon} />
            }
            title={t("auth.user.verifyEmail.success")}
            subTitle={t("auth.user.verifyEmail.successMessage")}
            extra={[
              <Button
                type="primary"
                key="login"
                size="large"
                block
                onClick={() => router.push("/auth/login")}
              >
                {t("auth.user.verifyEmail.goToLogin")}
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className={styles.centerBlock}>
        <Card className={styles.cardMax}>
          <Result
            icon={
              <CloseCircleOutlined className={styles.resultErrorIcon} />
            }
            title={t("auth.user.verifyEmail.error")}
            subTitle={t("auth.user.verifyEmail.errorMessage")}
          />

          <div className={styles.resultContent}>
            <Text
              type="secondary"
              className={styles.resultHelpText}
            >
              {t("auth.user.verifyEmail.resendEmailLabel")}
            </Text>
            <Form
              form={resendForm}
              onFinish={handleResend}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
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
                  loading={resendMutation.isPending}
                >
                  {t("auth.user.verifyEmail.resendEmail")}
                </Button>
              </Form.Item>
            </Form>

            <div className={styles.footerBlock}>
              <Link href="/auth/login" className={styles.link}>
                {t("auth.user.verifyEmail.goToLogin")}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No token state
  return (
    <div className={styles.centerBlock}>
      <Card className={styles.cardMax}>
        <Result
          icon={
            <MailOutlined className={styles.resultWarningIcon} />
          }
          title={t("auth.user.verifyEmail.title")}
          subTitle={t("auth.user.verifyEmail.noToken")}
        />

        <div className={styles.resultContent}>
          <Text type="secondary" className={styles.resultHelpText}>
            {t("auth.user.verifyEmail.resendEmailLabel")}
          </Text>
          <Form
            form={resendForm}
            onFinish={handleResend}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
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
                loading={resendMutation.isPending}
              >
                {t("auth.user.verifyEmail.resendEmail")}
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footerBlock}>
            <Link href="/auth/login" className={styles.link}>
              {t("auth.user.verifyEmail.goToLogin")}
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.suspenseFallback}>
          <Spin size="large" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
