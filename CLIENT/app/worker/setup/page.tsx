"use client";

import React, { useState } from "react";
import { Typography, message, Spin, Card } from "antd";
import { UserOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Step1BasicInfo } from "./components/Step1BasicInfo";
import { Step2Services } from "./components/Step2Services";
import { StepLayout } from "./components/StepLayout";
import { useApiMutation } from "@/lib/hooks/use-api";
import type {
  WorkerProfileUpdateInput,
  WorkerServiceInput,
} from "@/lib/types/worker";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";

const { Paragraph } = Typography;

export type StepStatus = "wait" | "process" | "finish" | "error";

export default function WorkerSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const [currentStep, setCurrentStep] = useState(0);
  const [step1Data, setStep1Data] = useState<WorkerProfileUpdateInput | null>(
    null
  );
  const [stepStatus, setStepStatus] = useState<StepStatus[]>([
    "process",
    "wait",
  ]);

  const profileMutation = useApiMutation("/auth/profile", "PATCH", {
    onSuccess: () => {
      message.success(t("worker.setup.success.profileSaved"));
      setStepStatus(["finish", "process"]);
      setCurrentStep(1);
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error?.message ||
          t("worker.setup.error.saveProfile")
      );
    },
  });

  const servicesMutation = useApiMutation("/worker/services", "POST", {
    onSuccess: () => {
      message.success(t("worker.setup.success.setupComplete"));
      setStepStatus(["finish", "finish"]);
      // Redirect to worker dashboard or profile page
      setTimeout(() => {
        router.push("/");
      }, 1500);
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error?.message ||
          t("worker.setup.error.saveServices")
      );
    },
  });

  const handleStep1Next = async (data: WorkerProfileUpdateInput) => {
    try {
      await profileMutation.mutateAsync({ worker_profile: data });
      setStep1Data(data);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStep2Next = async (data: WorkerServiceInput) => {
    try {
      await servicesMutation.mutateAsync(data);
    } catch (error) {
      handleError(error);
    }
  };

  const handleStep2Back = () => {
    setCurrentStep(0);
    setStepStatus(["process", "wait"]);
  };

  const steps = [
    {
      title: t("worker.setup.step1.title"),
      icon: <UserOutlined />,
    },
    {
      title: t("worker.setup.step2.title"),
      icon: <ShoppingOutlined />,
    },
  ];

  // Render Step 1 with full layout
  if (currentStep === 0) {
    return (
      <StepLayout stepTitle={t("worker.setup.step1.title")}>
        <Step1BasicInfo
          onNext={handleStep1Next}
          initialData={
            step1Data
              ? {
                  ...step1Data,
                  gender: step1Data.gender as any,
                  hobbies: step1Data.hobbies || [],
                  gallery_urls: step1Data.gallery_urls || [],
                }
              : null
          }
        />

        {/* Loading Overlay */}
        {profileMutation.isPending && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <Card>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, textAlign: "center" }}>
                {t("worker.setup.loading.savingProfile")}
              </Paragraph>
            </Card>
          </div>
        )}
      </StepLayout>
    );
  }

  // Render Step 2 with full layout
  if (currentStep === 1) {
    return (
      <StepLayout stepTitle={t("worker.setup.step2.title")}>
        <Step2Services onNext={handleStep2Next} onBack={handleStep2Back} />

        {/* Loading Overlay */}
        {servicesMutation.isPending && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <Card>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, textAlign: "center" }}>
                {t("worker.setup.loading.savingServices")}
              </Paragraph>
            </Card>
          </div>
        )}
      </StepLayout>
    );
  }

  return null;
}
