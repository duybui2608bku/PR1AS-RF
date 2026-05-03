"use client";

import React, { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import {
  Typography,
  message,
  Spin,
  Card,
  Row,
  Col,
  Button,
} from "antd";
import { PayCircleOutlined } from "@ant-design/icons";
import {
  Step1BasicInfo,
  type WorkerProfileStepHandle,
} from "./components/Step1BasicInfo";
import {
  Step2Services,
  type Step2ServicesHandle,
} from "./components/Step2Services";
import { useApiMutation } from "@/lib/hooks/use-api";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { User } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import styles from "@/app/worker/setup/page.module.scss";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const { Title, Paragraph } = Typography;
const REDIRECT_DELAY_MS = 1500;

interface WorkerSetupFlowProps {
  isEditMode?: boolean;
}

export function WorkerSetupFlow({ isEditMode = false }: WorkerSetupFlowProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const { user, setUser } = useAuthStore();
  const profileRef = useRef<WorkerProfileStepHandle>(null);
  const servicesRef = useRef<Step2ServicesHandle>(null);

  const profileMutation = useApiMutation<{ user: User }>(
    "/auth/profile",
    "PATCH",
    {
      onSuccess: (data) => {
        const updatedUser = data?.data?.user;
        if (updatedUser) {
          setUser(updatedUser);
        }
        message.success(t("worker.setup.success.profileSaved"));
      },
      onError: (error) => {
        message.error(
          error?.response?.data?.error?.message ||
            t("worker.setup.error.saveProfile")
        );
      },
    }
  );

  const servicesMutation = useApiMutation("/worker/services", "POST", {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["worker-services"] });
      try {
        const latestUser = await authApi.getMe();
        setUser(latestUser as unknown as User);
      } catch {
        // Non-blocking
      }

      message.success(t("worker.setup.success.setupComplete"));
      if (isEditMode && user?.id) {
        router.push(buildWorkerProfileRoute(user.id));
        return;
      }

      setTimeout(() => {
        router.push("/");
      }, REDIRECT_DELAY_MS);
    },
    onError: (error) => {
      message.error(
        error?.response?.data?.error?.message ||
          t("worker.setup.error.saveServices")
      );
    },
  });

  const handleComplete = useCallback(async () => {
    const profilePayload = await profileRef.current?.validateAndGetProfile();
    if (!profilePayload) {
      return;
    }
    const servicesPayload =
      servicesRef.current?.validateAndGetWorkerServices();
    if (!servicesPayload) {
      return;
    }
    try {
      await profileMutation.mutateAsync({ worker_profile: profilePayload });
      await servicesMutation.mutateAsync(servicesPayload);
    } catch (error) {
      handleError(error);
    }
  }, [profileMutation, servicesMutation, handleError]);

  const isBusy = profileMutation.isPending || servicesMutation.isPending;
  const loadingMessage = profileMutation.isPending
    ? t("worker.setup.loading.savingProfile")
    : t("worker.setup.loading.savingServices");

  return (
    <div className={`${styles.monolith} ${inter.className}`}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <Title level={3} className={styles.pageTitle}>
            {t("worker.setup.monolith.pageTitle")}
          </Title>
          <Paragraph type="secondary" className={styles.pageSubtitle}>
            {t("worker.setup.monolith.pageSubtitle")}
          </Paragraph>
        </header>

        <Step1BasicInfo ref={profileRef} />

        <section className={styles.stitchSection}>
          <div className={styles.servicesSectionLead}>
            <div className={styles.sectionHeader}>
              <PayCircleOutlined className={styles.sectionIcon} aria-hidden />
              <Title level={5} className={styles.sectionTitle}>
                {t("worker.setup.monolith.sectionServices")}
              </Title>
            </div>
            <Paragraph type="secondary" className={styles.sectionIntro}>
              {t("worker.setup.step2.subtitle")}
            </Paragraph>
          </div>
          <Step2Services
            ref={servicesRef}
            hideActions
            embedded
          />
        </section>

        <Row
          justify="space-between"
          align="middle"
          className={styles.footerRow}
        >
          <Col>
            <Button
              type="text"
              size="middle"
              className={styles.backButton}
              onClick={() => router.back()}
            >
              {t("worker.setup.monolith.footerBack")}
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              size="middle"
              className={styles.completeButton}
              loading={isBusy}
              onClick={() => void handleComplete()}
            >
              {t("worker.setup.monolith.footerComplete")}
            </Button>
          </Col>
        </Row>
      </div>

      {isBusy ? (
        <div className={styles.overlay}>
          <Card>
            <Spin size="large" />
            <Paragraph className={styles.loadingText}>{loadingMessage}</Paragraph>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkerSetupPage() {
  return <WorkerSetupFlow />;
}
