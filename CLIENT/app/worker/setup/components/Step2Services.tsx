"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Typography, Button, Checkbox, Empty, Spin, Modal, Row, Col } from "antd";
import { useApiQueryData } from "@/lib/hooks/use-api";
import type {
  Service,
  WorkerServiceInput,
  ServicePricing,
  PricingUnit,
} from "@/lib/types/worker";
import {
  ServiceCategory as ServiceCategoryEnum,
  PricingUnit as PricingUnitEnum,
} from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { ServicePricingInline } from "./ServicePricingInline";
import { validateNormalizedPricing } from "./service-pricing.utils";
import {
  filterAssistanceServicesForWorkerSetup,
  isServiceIncludedInWorkerSetupStep,
  splitCompanionshipServices,
} from "./worker-setup-services.utils";
import styles from "./Step2Services.module.scss";

const { Title } = Typography;

const DEFAULT_FIRST_PRICING_ROW: ServicePricing[] = [
  { unit: PricingUnitEnum.HOURLY, duration: 1, price: 0 },
];

export interface Step2ServicesHandle {
  validateAndGetWorkerServices: () => WorkerServiceInput | null;
}

interface Step2ServicesProps {
  onNext?: (data: WorkerServiceInput) => void;
  onBack?: () => void;
  isPending?: boolean;
  hideActions?: boolean;
  /** @deprecated All callers use monolith embedded UI; kept for API compatibility */
  embedded?: boolean;
}

interface SelectedService extends Service {
  pricing: ServicePricing[];
  is_active: boolean;
}

function buildWorkerServicePayload(
  selectedServices: Map<string, SelectedService>,
  t: (key: string) => string
): WorkerServiceInput | null {
  const included = Array.from(selectedServices.values()).filter((s) =>
    isServiceIncludedInWorkerSetupStep(s)
  );

  if (included.length === 0) {
    Modal.warning({
      title: t("common.warning"),
      content: t("worker.setup.step2.validation.noServices"),
      centered: true,
    });
    return null;
  }

  const servicesWithoutPricing = included.filter((s) => s.pricing.length === 0);

  if (servicesWithoutPricing.length > 0) {
    Modal.warning({
      title: t("common.warning"),
      content: `${t("worker.setup.step2.validation.noPricing")}: ${servicesWithoutPricing.map((s) => s.name.vi).join(", ")}`,
      centered: true,
    });
    return null;
  }

  for (const s of included) {
    const err = validateNormalizedPricing(s.pricing);
    if (err === "duplicate") {
      Modal.warning({
        title: t("common.warning"),
        content: `${s.name.vi}: ${t("worker.setup.step2.validation.duplicatePricingUnit")}`,
        centered: true,
      });
      return null;
    }
    if (err === "invalidPrice" || err === "empty") {
      Modal.warning({
        title: t("common.warning"),
        content: `${s.name.vi}: ${t("worker.setup.step2.validation.noPricing")}`,
        centered: true,
      });
      return null;
    }
  }

  return {
    services: included.map((service) => ({
      service_id: service.id,
      pricing: service.pricing,
    })),
  };
}

export const Step2Services = forwardRef<Step2ServicesHandle, Step2ServicesProps>(
  function Step2Services(
    {
      onNext,
      onBack,
      isPending = false,
      hideActions = false,
      embedded: _embedded = true,
    },
    ref
  ) {
    const { t } = useI18n();
    const { currency } = useCurrencyStore();
    const [selectedServices, setSelectedServices] = useState<
      Map<string, SelectedService>
    >(new Map());

    const { data: allServicesResponse } =
      useApiQueryData<{ services: Service[]; count: number }>(
        ["services", "all"],
        "/services",
        {
          enabled: true,
          staleTime: 0,
          refetchOnMount: true,
        }
      );

    const allServices = useMemo(
      () => allServicesResponse?.services || [],
      [allServicesResponse?.services]
    );

    const { data: assistanceServicesResponse, isLoading: isLoadingAssistance } =
      useApiQueryData<{ services: Service[]; count: number }>(
        ["services", "ASSISTANCE"],
        `/services?category=${ServiceCategoryEnum.ASSISTANCE}`,
        {
          enabled: true,
          staleTime: 0,
          refetchOnMount: true,
        }
      );

    const {
      data: companionshipServicesResponse,
      isLoading: isLoadingCompanionship,
    } = useApiQueryData<{ services: Service[]; count: number }>(
      ["services", "COMPANIONSHIP"],
      `/services?category=${ServiceCategoryEnum.COMPANIONSHIP}`,
      {
        enabled: true,
        staleTime: 0,
        refetchOnMount: true,
      }
    );

    const assistanceServicesForSetup = useMemo(
      () =>
        filterAssistanceServicesForWorkerSetup(
          assistanceServicesResponse?.services || []
        ),
      [assistanceServicesResponse?.services]
    );

    const companionshipServicesList = useMemo(
      () => companionshipServicesResponse?.services || [],
      [companionshipServicesResponse?.services]
    );

    const { companionshipBase, companionshipLevels } = useMemo(() => {
      const { base, levels } = splitCompanionshipServices(
        companionshipServicesList
      );
      return { companionshipBase: base, companionshipLevels: levels };
    }, [companionshipServicesList]);

    const { data: existingWorkerServicesResponse } = useApiQueryData<{
      services: Array<{
        service_id: string;
        service_code: string;
        pricing: Array<{
          unit: string;
          duration?: number;
          price: number;
          currency: string;
        }>;
        is_active: boolean;
      }>;
    }>(["worker-services"], "/worker/services", {
      enabled: true,
      staleTime: 0,
      refetchOnMount: true,
    });

    const existingWorkerServices = useMemo(
      () => existingWorkerServicesResponse?.services || [],
      [existingWorkerServicesResponse?.services]
    );

    const [hasLoadedExistingServices, setHasLoadedExistingServices] =
      useState(false);

    useEffect(() => {
      if (
        !hasLoadedExistingServices &&
        existingWorkerServices &&
        Array.isArray(existingWorkerServices) &&
        existingWorkerServices.length > 0 &&
        allServices.length > 0
      ) {
        const serviceMap = new Map(allServices.map((s) => [s.id, s]));
        const newSelectedServices = new Map<string, SelectedService>();

        existingWorkerServices.forEach((workerService) => {
          const service = serviceMap.get(workerService.service_id);
          if (service && isServiceIncludedInWorkerSetupStep(service)) {
            newSelectedServices.set(service.id, {
              ...service,
              pricing: workerService.pricing.map((p) => ({
                unit: p.unit as PricingUnit,
                duration: p.duration ?? 1,
                price: p.price,
              })),
              is_active: workerService.is_active,
            });
          }
        });

        queueMicrotask(() => {
          if (newSelectedServices.size > 0) {
            setSelectedServices(newSelectedServices);
          }
          setHasLoadedExistingServices(true);
        });
      }
    }, [existingWorkerServices, allServices, hasLoadedExistingServices]);

    useImperativeHandle(
      ref,
      () => ({
        validateAndGetWorkerServices: () =>
          buildWorkerServicePayload(selectedServices, t),
      }),
      [selectedServices, t]
    );

    const handleServiceToggle = (service: Service) => {
      const serviceId = service.id;
      const newSelectedServices = new Map(selectedServices);

      if (newSelectedServices.has(serviceId)) {
        newSelectedServices.delete(serviceId);
      } else {
        newSelectedServices.set(serviceId, {
          ...service,
          pricing: [...DEFAULT_FIRST_PRICING_ROW],
          is_active: true,
        });
      }

      setSelectedServices(newSelectedServices);
    };

    const updateServicePricing = useCallback(
      (serviceId: string, pricing: ServicePricing[]) => {
        setSelectedServices((prev) => {
          const next = new Map(prev);
          const existing = next.get(serviceId);
          if (!existing) {
            return next;
          }
          if (pricing.length === 0) {
            next.delete(serviceId);
            return next;
          }
          next.set(serviceId, { ...existing, pricing });
          return next;
        });
      },
      []
    );

    const handleSubmit = () => {
      const payload = buildWorkerServicePayload(selectedServices, t);
      if (payload) {
        onNext?.(payload);
      }
    };

    const renderServiceShell = (service: Service) => {
      const isSelected = selectedServices.has(service.id);
      const selectedService = selectedServices.get(service.id);
      const isCompact = !isSelected;
      const checkboxId = `worker-setup-svc-${service.id}`;

      return (
        <div
          className={`${styles.stitchServiceShell} ${
            isCompact
              ? styles.stitchServiceCompact
              : styles.stitchServiceExpanded
          }`}
        >
          {isCompact ? (
            <div className={styles.stitchServiceCompactInner}>
              <Checkbox
                id={checkboxId}
                checked={isSelected}
                onChange={() => handleServiceToggle(service)}
              />
              <label
                htmlFor={checkboxId}
                className={styles.stitchServiceNameCompact}
              >
                {service.name.vi}
              </label>
            </div>
          ) : (
            <>
              <div className={styles.stitchServiceExpandedTop}>
                <div className={styles.stitchServiceExpandedLead}>
                  <Checkbox
                    id={checkboxId}
                    checked={isSelected}
                    onChange={() => handleServiceToggle(service)}
                  />
                  <label
                    htmlFor={checkboxId}
                    className={styles.stitchServiceNameExpanded}
                  >
                    {service.name.vi}
                  </label>
                </div>
              </div>
              <ServicePricingInline
                pricing={selectedService?.pricing ?? []}
                currency={currency}
                onChange={(next) => updateServicePricing(service.id, next)}
              />
            </>
          )}
        </div>
      );
    };

    const hasCompanionshipRows =
      !!companionshipBase || companionshipLevels.length > 0;

    return (
      <div
        className={`${styles.container} ${styles.embedded} ${styles.setupSkin}`}
      >
        <div className={styles.embeddedCategoriesStack}>
          <div className={styles.monolithCategoryBlock}>
            <div className={styles.categoryGroupHeader}>
              <span className={styles.categoryAccentBar} aria-hidden />
              <Title level={5} className={styles.categoryGroupTitle}>
                {t("worker.setup.step2.category.assistance")}
              </Title>
            </div>
            {isLoadingAssistance ? (
              <div className={styles.spinWrapper}>
                <Spin size="large" />
              </div>
            ) : assistanceServicesForSetup.length > 0 ? (
              <div className={styles.assistanceStack}>
                {assistanceServicesForSetup.map((service) => (
                  <div key={service.id} className={styles.assistanceRow}>
                    {renderServiceShell(service)}
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description={t("worker.setup.step2.services.noServices")}
              />
            )}
          </div>

          <div className={styles.monolithCategoryBlock}>
            <div className={styles.categoryGroupHeader}>
              <span className={styles.categoryAccentBar} aria-hidden />
              <Title level={5} className={styles.categoryGroupTitle}>
                {t("worker.setup.step2.category.companionship")}
              </Title>
            </div>
            {isLoadingCompanionship ? (
              <div className={styles.spinWrapper}>
                <Spin size="large" />
              </div>
            ) : hasCompanionshipRows ? (
              <div className={styles.companionGrid}>
                {companionshipBase ? (
                  <div className={styles.companionGridCell}>
                    {renderServiceShell(companionshipBase)}
                  </div>
                ) : null}
                {companionshipLevels.map((service) => (
                  <div key={service.id} className={styles.companionGridCell}>
                    {renderServiceShell(service)}
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description={t("worker.setup.step2.services.noServices")}
              />
            )}
          </div>
        </div>

        {!hideActions ? (
          <Row justify="space-between" align="middle" className={styles.navRow}>
            <Col>
              <Button onClick={onBack} size="large">
                {t("worker.setup.step2.back")}
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={isPending}
                size="large"
              >
                {t("worker.setup.step2.complete")}
              </Button>
            </Col>
          </Row>
        ) : null}
      </div>
    );
  }
);
