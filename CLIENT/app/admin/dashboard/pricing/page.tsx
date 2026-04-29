"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  Row,
  Space,
  Spin,
  Switch,
  Typography,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { PricingPackage, pricingApi } from "@/lib/api/pricing.api";
import styles from "./page.module.scss";

const { Title, Text } = Typography;

const renderNullableNumber = (value: number | null): number | null =>
  value === null ? null : value;

export default function AdminPricingPage() {
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [localFeatures, setLocalFeatures] = useState<
    Record<string, PricingPackage["features"]>
  >({});
  const [localIsActive, setLocalIsActive] = useState<Record<string, boolean>>(
    {}
  );

  const {
    data: packages,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-pricing-packages"],
    queryFn: () => pricingApi.getAdminPackages(),
  });

  const updateMutation = useStandardizedMutation(
    async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<PricingPackage>;
    }) => {
      return pricingApi.updatePackage(id, payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-pricing-packages"] });
        queryClient.invalidateQueries({ queryKey: ["public-pricing-packages"] });
        message.success(t("admin.pricing.updateSuccess"));
      },
    }
  );

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);
  useEffect(() => {
    if (!packages) return;

    setLocalFeatures((prev) => {
      const next = { ...prev };
      packages.forEach((pkg) => {
        if (!next[pkg.id]) {
          next[pkg.id] = { ...pkg.features };
        }
      });
      return next;
    });

    setLocalIsActive((prev) => {
      const next = { ...prev };
      packages.forEach((pkg) => {
        if (!(pkg.id in next)) {
          next[pkg.id] = pkg.is_active;
        }
      });
      return next;
    });
  }, [packages]);

  const runPackageUpdate = async (
    item: PricingPackage,
    payload: Partial<PricingPackage>
  ): Promise<void> => {
    setSavingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await updateMutation.mutateAsync({ id: item.id, payload });
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const onToggle = (
    item: PricingPackage,
    key:
      | "messaging_enabled"
      | "create_job_enabled"
      | "boost_profile_enabled"
      | "ads_enabled"
      | "is_active",
    checked: boolean
  ): Promise<void> => {
    if (key === "is_active") {
      setLocalIsActive((prev) => ({ ...prev, [item.id]: checked }));
      return runPackageUpdate(item, { is_active: checked });
    }
    const currentFeatures = localFeatures[item.id] ?? item.features;
    const features = { ...currentFeatures, [key]: checked };

    if (key === "messaging_enabled" && !checked) {
      features.messaging_max_recipients = null;
    }
    if (key === "create_job_enabled" && !checked) {
      features.create_job_limit = null;
    }
    if (key === "boost_profile_enabled" && !checked) {
      features.boost_profile_monthly_limit = null;
    }
    setLocalFeatures((prev) => ({ ...prev, [item.id]: features }));

    return runPackageUpdate(item, { features });
  };

  const onNumberChange = (
    item: PricingPackage,
    key:
      | "messaging_max_recipients"
      | "create_job_limit"
      | "boost_profile_monthly_limit",
    value: number | null
  ): Promise<void> => {
    const currentFeatures = localFeatures[item.id] ?? item.features;
    const features = { ...currentFeatures, [key]: value };
    setLocalFeatures((prev) => ({ ...prev, [item.id]: features }));

    return runPackageUpdate(item, { features });
  };

  const renderFeatureRow = (
    item: PricingPackage,
    key:
      | "messaging_enabled"
      | "create_job_enabled"
      | "boost_profile_enabled"
      | "ads_enabled",
    label: string,
    limitLabel?: string,
    limitKey?:
      | "messaging_max_recipients"
      | "create_job_limit"
      | "boost_profile_monthly_limit",
    minValue = 1
  ) => {
    const isSavingThisPackage = Boolean(savingIds[item.id]);
    const features = localFeatures[item.id] ?? item.features;
    const enabled = features[key];
    const limitValue = limitKey ? features[limitKey] : null;

    return (
      <div className={styles.featureRow}>
        <div className={styles.featureTop}>
          <Text strong>{label}</Text>
          <Switch
            checked={enabled}
            onChange={(checked) => {
              void onToggle(item, key, checked);
            }}
            disabled={isSavingThisPackage}
          />
        </div>
        {limitKey && limitLabel ? (
          <div className={styles.limitRow}>
            <Text type="secondary">{limitLabel}</Text>
            <InputNumber
              min={minValue}
              disabled={!enabled || isSavingThisPackage}
              value={renderNullableNumber(limitValue)}
              onChange={(value) => {
                void onNumberChange(item, limitKey, value);
              }}
            />
          </div>
        ) : null}
      </div>
    );
  };

  const hasPackages = (packages?.length || 0) > 0;

  return (
    <Space direction="vertical" size="large" className={styles.container}>
      <Space className={styles.headerRow}>
        <div>
          <Title level={2}>{t("admin.pricing.title")}</Title>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
        >
          {t("common.refresh")}
        </Button>
      </Space>

      {isLoading ? (
        <Card>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
          </div>
        </Card>
      ) : null}

      {!isLoading && !hasPackages ? (
        <Card>
          <Empty />
        </Card>
      ) : null}

      {!isLoading &&
        packages?.map((item) => {
          const isSavingThisPackage = Boolean(savingIds[item.id]);
          const isActive = localIsActive[item.id] ?? item.is_active;
          return (
            <Card
              key={item.id}
              title={`${item.display_name} (${item.package_code.toUpperCase()})`}
              extra={
                <Space>
                  <Text>{t("admin.pricing.active")}</Text>
                  <Switch
                    checked={isActive}
                    onChange={(checked) => {
                      void onToggle(item, "is_active", checked);
                    }}
                    disabled={isSavingThisPackage}
                  />
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} xl={6}>
                  {renderFeatureRow(
                    item,
                    "messaging_enabled",
                    t("pricing.features.messaging"),
                    t("admin.pricing.maxRecipients"),
                    "messaging_max_recipients"
                  )}
                </Col>

                <Col xs={24} sm={12} xl={6}>
                  {renderFeatureRow(
                    item,
                    "create_job_enabled",
                    t("pricing.features.createJob"),
                    t("admin.pricing.jobLimit"),
                    "create_job_limit"
                  )}
                </Col>

                <Col xs={24} sm={12} xl={6}>
                  {renderFeatureRow(
                    item,
                    "boost_profile_enabled",
                    t("pricing.features.boostProfile"),
                    t("admin.pricing.boostLimit"),
                    "boost_profile_monthly_limit",
                    0
                  )}
                </Col>

                <Col xs={24} sm={12} xl={6}>
                  {renderFeatureRow(
                    item,
                    "ads_enabled",
                    t("pricing.features.ads")
                  )}
                  <Text type="secondary">{t("admin.pricing.adsHint")}</Text>
                </Col>
              </Row>

              <div className={styles.footerNote}>
                <Text type="secondary">
                  {t("admin.pricing.autoSaveHint")}
                </Text>
              </div>
            </Card>
          );
        })}
    </Space>
  );
}