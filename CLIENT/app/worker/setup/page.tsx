"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Typography, message, Spin, Card } from "antd";
import { Step1BasicInfo } from "./components/Step1BasicInfo";
import { Step2Services } from "./components/Step2Services";
import { StepLayout } from "./components/StepLayout";
import { useApiMutation } from "@/lib/hooks/use-api";
import type {
  WorkerProfile,
  WorkerProfileUpdateInput,
  WorkerServiceInput,
} from "@/lib/types/worker";
import { Gender } from "@/lib/types/worker";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { User } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import styles from "@/app/worker/setup/page.module.scss";

const { Paragraph } = Typography;
const REDIRECT_DELAY_MS = 1500;

export type StepStatus = "wait" | "process" | "finish" | "error";

interface WorkerSetupFlowProps {
  isEditMode?: boolean;
}

export function WorkerSetupFlow({ isEditMode = false }: WorkerSetupFlowProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const { user, setUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [step1Data, setStep1Data] = useState<WorkerProfileUpdateInput | null>(
    null
  );
  const [, setStepStatus] = useState<StepStatus[]>(["process", "wait"]);

  const step1ProfileData: WorkerProfile | null = useMemo(() => step1Data
    ? {
        ...step1Data,
        gender: step1Data.gender ?? Gender.MALE,
        hobbies: step1Data.hobbies || [],
        gallery_urls: step1Data.gallery_urls || [],
      }
    : null, [step1Data]);

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
        setStepStatus(["finish", "process"]);
        setCurrentStep(1);
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
      try {
        const latestUser = await authApi.getMe();
        setUser(latestUser as unknown as User);
      } catch {
        // Non-blocking: store sẽ được làm mới ở AuthGuard lần render kế tiếp
      }

      message.success(t("worker.setup.success.setupComplete"));
      setStepStatus(["finish", "finish"]);
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

  const handleStep1Next = useCallback(async (data: WorkerProfileUpdateInput) => {
    try {
      await profileMutation.mutateAsync({ worker_profile: data });
      setStep1Data(data);
    } catch (error) {
      handleError(error);
    }
  }, [profileMutation, handleError]);

  const handleStep2Next = useCallback(async (data: WorkerServiceInput) => {
    try {
      await servicesMutation.mutateAsync(data);
    } catch (error) {
      handleError(error);
    }
  }, [servicesMutation, handleError]);

  const handleStep2Back = useCallback(() => {
    setCurrentStep(0);
    setStepStatus(["process", "wait"]);
  }, []);

  if (currentStep === 0) {
    return (
      <StepLayout stepTitle={t("worker.setup.step1.title")}>
        <Step1BasicInfo
          onNext={handleStep1Next}
          isPending={profileMutation.isPending}
          initialData={step1ProfileData}
        />
        {profileMutation.isPending ? (
          <div className={styles.overlay}>
            <Card>
              <Spin size="large" />
              <Paragraph className={styles.loadingText}>
                {t("worker.setup.loading.savingProfile")}
              </Paragraph>
            </Card>
          </div>
        ) : null}
      </StepLayout>
    );
  }

  if (currentStep === 1) {
    return (
      <StepLayout stepTitle={t("worker.setup.step2.title")}>
        <Step2Services 
          onNext={handleStep2Next} 
          onBack={handleStep2Back}
          isPending={servicesMutation.isPending}
        />
        {servicesMutation.isPending ? (
          <div className={styles.overlay}>
            <Card>
              <Spin size="large" />
              <Paragraph className={styles.loadingText}>
                {t("worker.setup.loading.savingServices")}
              </Paragraph>
            </Card>
          </div>
        ) : null}
      </StepLayout>
    );
  }

  return null;
}

export default function WorkerSetupPage() {
  return <WorkerSetupFlow />;
}
