"use client";

import { Button, Typography } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CrownFilled,
  StarFilled,
  ThunderboltFilled,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";
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

  const features: Feature[] = [
    {
      label: t("pricing.features.messaging"),
      standard: false,
      gold: t("pricing.features.messagingGold"),
      diamond: t("pricing.features.messagingDiamond"),
    },
    {
      label: t("pricing.features.createJob"),
      standard: t("pricing.features.createJobStandard"),
      gold: t("pricing.features.createJobGold"),
      diamond: t("pricing.features.createJobDiamond"),
    },
    {
      label: t("pricing.features.boostProfile"),
      standard: false,
      gold: t("pricing.features.boostProfileGold"),
      diamond: t("pricing.features.boostProfileDiamond"),
    },
    {
      label: t("pricing.features.ads"),
      standard: false,
      gold: false,
      diamond: t("pricing.features.adsDiamond"),
    },
  ];

  const plans = [
    {
      key: "standard",
      name: t("pricing.plans.standard.name"),
      price: t("pricing.plans.standard.price"),
      period: t("pricing.plans.standard.period"),
      description: t("pricing.plans.standard.description"),
      icon: <StarFilled />,
      cta: t("pricing.plans.standard.cta"),
      ctaType: "default" as const,
      highlighted: false,
      className: styles.cardStandard,
      headerClass: styles.headerStandard,
    },
    {
      key: "gold",
      name: t("pricing.plans.gold.name"),
      price: t("pricing.plans.gold.price"),
      period: t("pricing.plans.gold.period"),
      description: t("pricing.plans.gold.description"),
      icon: <CrownFilled />,
      cta: t("pricing.plans.gold.cta"),
      ctaType: "primary" as const,
      highlighted: true,
      className: styles.cardGold,
      headerClass: styles.headerGold,
    },
    {
      key: "diamond",
      name: t("pricing.plans.diamond.name"),
      price: t("pricing.plans.diamond.price"),
      period: t("pricing.plans.diamond.period"),
      description: t("pricing.plans.diamond.description"),
      icon: <ThunderboltFilled />,
      cta: t("pricing.plans.diamond.cta"),
      ctaType: "default" as const,
      highlighted: false,
      className: styles.cardDiamond,
      headerClass: styles.headerDiamond,
    },
  ];

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
        {plans.map((plan) => (
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
        ))}
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
                <th className={styles.thStandard}>{t("pricing.plans.standard.name")}</th>
                <th className={`${styles.thGold} ${styles.thHighlight}`}>{t("pricing.plans.gold.name")}</th>
                <th className={styles.thDiamond}>{t("pricing.plans.diamond.name")}</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={feature.label} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td className={styles.tdFeature}>{feature.label}</td>
                  <td className={styles.tdValue}>
                    {feature.standard === false ? (
                      <CloseCircleFilled className={styles.iconNo} />
                    ) : (
                      <span className={styles.valueText}>{feature.standard}</span>
                    )}
                  </td>
                  <td className={`${styles.tdValue} ${styles.tdHighlight}`}>
                    {feature.gold === false ? (
                      <CloseCircleFilled className={styles.iconNo} />
                    ) : (
                      <span className={styles.valueText}>{feature.gold}</span>
                    )}
                  </td>
                  <td className={styles.tdValue}>
                    {feature.diamond === false ? (
                      <CloseCircleFilled className={styles.iconNo} />
                    ) : (
                      <span className={styles.valueTextDiamond}>{feature.diamond}</span>
                    )}
                  </td>
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
