"use client";

import { Card, Row, Col, Checkbox, Typography } from "antd";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useCurrency } from "@/lib/hooks/use-currency";
import type { Service } from "@/lib/types/worker";
import { formatPrice, getServiceName } from "@/lib/utils/worker.utils";
import styles from "../[id]/worker-detail.module.scss";

const { Text } = Typography;

interface WorkerService {
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
}

export function WorkerServices({
  services,
  selectedServices,
  onServiceToggle,
  serviceMap,
  isLoading = false,
}: WorkerServicesProps) {
  const { t, locale } = useI18n();
  const { currency } = useCurrency();

  if (isLoading) {
    return (
      <Card
        className={styles.bookingCard}
        title={t("worker.detail.services.title") || "Dịch vụ"}
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary">{t("common.loading")}</Text>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card
        className={styles.bookingCard}
        title={t("worker.detail.services.title") || "Dịch vụ"}
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary">
          {t("worker.detail.services.noServices") || "Không có dịch vụ"}
        </Text>
      </Card>
    );
  }

  const unitLabels = {
    HOURLY: t("worker.setup.step2.selected.hour") || "giờ",
    DAILY: t("worker.setup.step2.selected.day") || "ngày",
    MONTHLY: t("worker.setup.step2.selected.month") || "tháng",
  };

  const activeServices = services.filter((ws) => ws.is_active);

  return (
    <Card
      className={styles.bookingCard}
      title={t("worker.detail.services.title") || "Dịch vụ"}
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[12, 12]} className={styles.servicesList}>
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

          const isSelected = selectedServices.includes(workerService.service_id);

          return (
            <Col xs={24} sm={12} key={workerService.service_id}>
              <Card
                className={`${styles.serviceCard} ${
                  isSelected ? styles.serviceCardSelected : ""
                }`}
                hoverable
                onClick={() => onServiceToggle(workerService.service_id)}
                style={{ cursor: "pointer" }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onServiceToggle(workerService.service_id);
                  }}
                >
                  <div className={styles.serviceCardContent}>
                    <Text strong>{serviceName}</Text>
                    <Text
                      type="secondary"
                      style={{
                        display: "block",
                        fontSize: 12,
                      }}
                    >
                      {priceText}
                    </Text>
                  </div>
                </Checkbox>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

