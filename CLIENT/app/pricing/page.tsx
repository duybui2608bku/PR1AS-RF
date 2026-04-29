"use client";

import { type ReactNode, useMemo } from "react";
import { Alert, Button, Empty, Spin, Typography } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CrownFilled,
  StarFilled,
  ThunderboltFilled,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { pricingApi, PricingPackage, PricingPlanCode } from "@/lib/api/pricing.api";
import styles from "./page.module.scss";

const { Title, Text, Paragraph } = Typography;

interface Feature {
  label: string;
  standard: string | false;
  gold: string | false;
  diamond: string | false;
}

const PricingIcon = ({ value }: { value: string | false }) => {
  if (value === false) {
    return <CloseCircleFilled className={styles.iconNo} />;
  }
  return <CheckCircleFilled className={styles.iconYes} />;
};

export default function PricingPage() {
  const { t } = useTranslation();

  const {
    data: packages,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-pricing-packages"],
    queryFn: () => pricingApi.getPublicPackages(),
  });

  const packageByCode = useMemo(() => {
    const map = new Map<PricingPlanCode, PricingPackage>();
    (packages || []).forEach((item) => map.set(item.package_code, item));
    return map;
  }, [packages]);

  const getPlanValue = (
    packageCode: PricingPlanCode,
    valueBuilder: (pkg: PricingPackage) => string | false
  ): string | false => {
    const pkg = packageByCode.get(packageCode);
    if (!pkg) {
      return false;
    }
    return valueBuilder(pkg);
  };

  const formatLimit = (
    limit: number | null,
    unitKey: "people" | "jobs" | "times"
  ): string => {
    if (limit === null) {
      return t("pricing.features.unlimited");
    }
    if (unitKey === "times") {
      return t("pricing.features.boostPerMonth", { count: limit });
    }
    if (unitKey === "people") {
      return t("pricing.features.upToPeople", { count: limit });
    }
    return t("pricing.features.upToJobs", { count: limit });
  };

  const activePlans = useMemo(() => {
    const planOrder: PricingPlanCode[] = ["standard", "gold", "diamond"];
    return planOrder
      .map((code) => packageByCode.get(code))
      .filter((pkg): pkg is PricingPackage => Boolean(pkg && pkg.is_active));
  }, [packageByCode]);

  const features: Feature[] = [
    {
      label: t("pricing.features.messaging"),
      standard: getPlanValue("standard", (pkg) =>
        pkg.features.messaging_enabled
          ? formatLimit(pkg.features.messaging_max_recipients, "people")
          : false
      ),
      gold: getPlanValue("gold", (pkg) =>
        pkg.features.messaging_enabled
          ? formatLimit(pkg.features.messaging_max_recipients, "people")
          : false
      ),
      diamond: getPlanValue("diamond", (pkg) =>
        pkg.features.messaging_enabled
          ? formatLimit(pkg.features.messaging_max_recipients, "people")
          : false
      ),
    },
    {
      label: t("pricing.features.createJob"),
      standard: getPlanValue("standard", (pkg) =>
        pkg.features.create_job_enabled
          ? formatLimit(pkg.features.create_job_limit, "jobs")
          : false
      ),
      gold: getPlanValue("gold", (pkg) =>
        pkg.features.create_job_enabled
          ? formatLimit(pkg.features.create_job_limit, "jobs")
          : false
      ),
      diamond: getPlanValue("diamond", (pkg) =>
        pkg.features.create_job_enabled
          ? formatLimit(pkg.features.create_job_limit, "jobs")
          : false
      ),
    },
    {
      label: t("pricing.features.boostProfile"),
      standard: getPlanValue("standard", (pkg) =>
        pkg.features.boost_profile_enabled
          ? formatLimit(pkg.features.boost_profile_monthly_limit, "times")
          : false
      ),
      gold: getPlanValue("gold", (pkg) =>
        pkg.features.boost_profile_enabled
          ? formatLimit(pkg.features.boost_profile_monthly_limit, "times")
          : false
      ),
      diamond: getPlanValue("diamond", (pkg) =>
        pkg.features.boost_profile_enabled
          ? formatLimit(pkg.features.boost_profile_monthly_limit, "times")
          : false
      ),
    },
    {
      label: t("pricing.features.ads"),
      standard: getPlanValue("standard", (pkg) =>
        pkg.features.ads_enabled ? false : t("pricing.features.adsDiamond")
      ),
      gold: getPlanValue("gold", (pkg) =>
        pkg.features.ads_enabled ? false : t("pricing.features.adsDiamond")
      ),
      diamond: getPlanValue("diamond", (pkg) =>
        pkg.features.ads_enabled ? false : t("pricing.features.adsDiamond")
      ),
    },
  ];

  const planUiMap: Record<
    PricingPlanCode,
    {
      fallbackName: string;
      price: string;
      period: string;
      description: string;
      icon: ReactNode;
      cta: string;
      ctaType: "default" | "primary";
      highlighted: boolean;
      className: string;
      headerClass: string;
      thClassName: string;
      tdClassName?: string;
      valueClassName?: string;
    }
  > = {
    standard: {
      fallbackName: t("pricing.plans.standard.name"),
      price: t("pricing.plans.standard.price"),
      period: t("pricing.plans.standard.period"),
      description: t("pricing.plans.standard.description"),
      icon: <StarFilled />,
      cta: t("pricing.plans.standard.cta"),
      ctaType: "default",
      highlighted: false,
      className: styles.cardStandard,
      headerClass: styles.headerStandard,
      thClassName: styles.thStandard,
    },
    gold: {
      fallbackName: t("pricing.plans.gold.name"),
      price: t("pricing.plans.gold.price"),
      period: t("pricing.plans.gold.period"),
      description: t("pricing.plans.gold.description"),
      icon: <CrownFilled />,
      cta: t("pricing.plans.gold.cta"),
      ctaType: "primary",
      highlighted: true,
      className: styles.cardGold,
      headerClass: styles.headerGold,
      thClassName: `${styles.thGold} ${styles.thHighlight}`,
      tdClassName: styles.tdHighlight,
    },
    diamond: {
      fallbackName: t("pricing.plans.diamond.name"),
      price: t("pricing.plans.diamond.price"),
      period: t("pricing.plans.diamond.period"),
      description: t("pricing.plans.diamond.description"),
      icon: <ThunderboltFilled />,
      cta: t("pricing.plans.diamond.cta"),
      ctaType: "default",
      highlighted: false,
      className: styles.cardDiamond,
      headerClass: styles.headerDiamond,
      thClassName: styles.thDiamond,
      valueClassName: styles.valueTextDiamond,
    },
  };

  const plans = activePlans.map((pkg) => ({
    key: pkg.package_code,
    name: pkg.display_name || planUiMap[pkg.package_code].fallbackName,
    ...planUiMap[pkg.package_code],
  }));

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Title level={1} className={styles.heroTitle}>
          {t("pricing.title")}
        </Title>
        <Paragraph className={styles.heroSubtitle}>
          {t("pricing.subtitle")}
        </Paragraph>
      </div>

      <div className={styles.cardsRow}>
        {isLoading ? (
          <Spin size="large" />
        ) : isError ? (
          <Alert type="error" showIcon message={t("errors.unknown.title")} />
        ) : plans.length === 0 ? (
          <Empty description={t("pricing.subtitle")} />
        ) : (
          plans.map((plan) => (
          <div key={plan.key} className={`${styles.cardWrapper} ${plan.highlighted ? styles.highlighted : ""}`}>
            {plan.highlighted && (
              <div className={styles.popularBadge}>
                {t("pricing.popular")}
              </div>
            )}
            <div className={`${styles.card} ${plan.className}`}>
              <div className={`${styles.cardHeader} ${plan.headerClass}`}>
                <span className={styles.planIcon}>{plan.icon}</span>
                <Title level={3} className={styles.planName}>
                  {plan.name}
                </Title>
                <Text className={styles.planDescription}>{plan.description}</Text>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.priceBlock}>
                  <span className={styles.price}>{plan.price}</span>
                  {plan.period && (
                    <span className={styles.period}>/{plan.period}</span>
                  )}
                </div>

                <ul className={styles.featureList}>
                  {features.map((feature) => {
                    const value = plan.key === "standard"
                      ? feature.standard
                      : plan.key === "gold"
                      ? feature.gold
                      : feature.diamond;

                    return (
                      <li key={feature.label} className={styles.featureItem}>
                        <PricingIcon value={value} />
                        <span className={styles.featureLabel}>{feature.label}</span>
                        {value !== false && (
                          <span className={styles.featureValue}>{value}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type={plan.ctaType}
                  size="large"
                  block
                  className={`${styles.ctaBtn} ${plan.highlighted ? styles.ctaBtnGold : ""}`}
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      <div className={styles.tableSection}>
        <Title level={2} className={styles.tableTitle}>
          {t("pricing.compareTitle")}
        </Title>
        <div className={styles.tableWrapper}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th className={styles.thFeature}>{t("pricing.features.label")}</th>
                {plans.map((plan) => (
                  <th key={plan.key} className={plan.thClassName}>
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={feature.label} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td className={styles.tdFeature}>{feature.label}</td>
                  {plans.map((plan) => {
                    const value = feature[plan.key];
                    return (
                      <td
                        key={`${feature.label}-${plan.key}`}
                        className={`${styles.tdValue} ${plan.tdClassName || ""}`}
                      >
                        {value === false ? (
                          <CloseCircleFilled className={styles.iconNo} />
                        ) : (
                          <span className={plan.valueClassName || styles.valueText}>{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.faq}>
        <Title level={3} className={styles.faqTitle}>
          {t("pricing.faq.title")}
        </Title>
        <Paragraph className={styles.faqText}>
          {t("pricing.faq.contactText")}{" "}
          <Link href="/#contact" className={styles.faqLink}>
            {t("pricing.faq.contactLink")}
          </Link>
          .
        </Paragraph>
      </div>
    </div>
  );
}
