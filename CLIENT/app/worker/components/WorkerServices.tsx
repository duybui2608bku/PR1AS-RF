"use client";

import { Card, Row, Col, Radio, Typography } from "antd";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useCurrency } from "@/lib/hooks/use-currency";
import type { Service } from "@/lib/types/worker";
import { formatPrice, getServiceName } from "@/lib/utils/worker.utils";
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "../[id]/worker-detail.module.scss";

const { Text } = Typography;

interface WorkerService {
  _id: string;
  service_id: string;
  service_code: string;
  pricing: Array<{
    unit: string;
    duration: number;
    price: number;
    currency: string;
  }>;
  is_active: boolean;
}

interface WorkerServicesProps {
  services: WorkerService[];
  selectedServices: string[];
  onServiceToggle: (serviceId: string) => void;
  serviceMap: Map<string, Service>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function WorkerServices({
  services,
  selectedServices,
  onServiceToggle,
  serviceMap,
  isLoading = false,
  disabled = false,
}: WorkerServicesProps) {
  const { t, locale } = useI18n();
  const { currency } = useCurrency();

  if (isLoading) {
    return (
      <Card
        className={`${styles.bookingCard} ${styles.bookingCardMargin}`}
        title={t("worker.detail.services.title")}
      >
        <Text type="secondary">{t("common.loading")}</Text>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card
        className={`${styles.bookingCard} ${styles.bookingCardMargin}`}
        title={t("worker.detail.services.title")}
      >
        <Text type="secondary">{t("worker.detail.services.noServices")}</Text>
      </Card>
    );
  }

  const unitLabels = {
    HOURLY: t("worker.setup.step2.selected.hour"),
    DAILY: t("worker.setup.step2.selected.day"),
    MONTHLY: t("worker.setup.step2.selected.month"),
  };

  const activeServices = services.filter((ws) => ws.is_active);

  return (
    <Card
      className={styles.bookingCard}
      title={t("worker.detail.services.title")}
      style={{ marginBottom: Spacing.LG }}
    >
      <Row gutter={[Spacing.MD, Spacing.MD]} className={styles.servicesList}>
        {activeServices.map((workerService) => {
          const firstPricing = workerService.pricing[0];
          if (!firstPricing) return null;
          const serviceName = getServiceName({
            serviceCode: workerService.service_code,
            serviceMap,
            locale,
          });
          const priceText = formatPrice({
            price: firstPricing.price,
            unit: firstPricing.unit,
            currencyCode: firstPricing.currency || currency,
            unitLabels,
          });

          const isSelected = selectedServices.includes(
            workerService.service_id
          );

          return (
            <Col xs={24} sm={12} key={workerService.service_id}>
              <Card
                className={`${styles.serviceCard} ${
                  isSelected ? styles.serviceCardSelected : ""
                }`}
                hoverable={!disabled}
                onClick={disabled ? undefined : () => onServiceToggle(workerService.service_id)}
                style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}
              >
                <Radio
                  checked={isSelected}
                  disabled={disabled}
                  onChange={disabled ? undefined : () => onServiceToggle(workerService.service_id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.serviceCardContent}>
                    <Text strong>{serviceName}</Text>
                    <Text type="secondary" className={styles.servicePriceText}>
                      {priceText}
                    </Text>
                  </div>
                </Radio>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}
