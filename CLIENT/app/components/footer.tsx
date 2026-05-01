"use client";

import { Layout, Row, Col, Typography, Space, Divider } from "antd";
import {
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { memo } from "react";
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "./footer.module.scss";

const { Footer: AntFooter } = Layout;
const { Title, Text } = Typography;

const CURRENT_YEAR = new Date().getFullYear();

const FACEBOOK_ICON = <FacebookOutlined className={styles.socialIcon} />;
const TWITTER_ICON = <TwitterOutlined className={styles.socialIcon} />;
const INSTAGRAM_ICON = <InstagramOutlined className={styles.socialIcon} />;
const LINKEDIN_ICON = <LinkedinOutlined className={styles.socialIcon} />;
const MAIL_ICON = <MailOutlined />;
const PHONE_ICON = <PhoneOutlined />;

const FooterComponent = () => {
  const { t } = useTranslation();

  return (
    <AntFooter className={styles.footer}>
      <div className={styles.container}>
        <Row gutter={[Spacing.XXL, Spacing.XXL]}>
          <Col xs={24} sm={12} md={6}>
            <Title level={4} className={styles.sectionTitle}>
              {t("home.footer.company.title")}
            </Title>
            <Text type="secondary" className={styles.descriptionBlock}>
              {t("home.footer.company.description")}
            </Text>
            <Space size="middle" className={styles.socialSpace}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                {FACEBOOK_ICON}
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                {TWITTER_ICON}
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                {INSTAGRAM_ICON}
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                {LINKEDIN_ICON}
              </a>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Title level={4} className={styles.sectionTitle}>
              {t("home.footer.links.title")}
            </Title>
            <Space orientation="vertical" size="small">
              <Link href="/" className={styles.footerLink}>
                {t("home.nav.home")}
              </Link>
              <Link href="/#about" className={styles.footerLink}>
                {t("home.nav.about")}
              </Link>
              <Link href="/#services" className={styles.footerLink}>
                {t("home.nav.services")}
              </Link>
              <Link href="/pricing" className={styles.footerLink}>
                {t("home.footer.pricing")}
              </Link>
              <Link href="/#contact" className={styles.footerLink}>
                {t("home.nav.contact")}
              </Link>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Title level={4} className={styles.sectionTitle}>
              {t("home.footer.services.title")}
            </Title>
            <Space orientation="vertical" size="small">
              <Text type="secondary" className={styles.descriptionBlock}>
                {t("home.footer.services.item1")}
              </Text>
              <Text type="secondary" className={styles.descriptionBlock}>
                {t("home.footer.services.item2")}
              </Text>
              <Text type="secondary" className={styles.descriptionBlock}>
                {t("home.footer.services.item3")}
              </Text>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Title level={4} className={styles.sectionTitle}>
              {t("home.footer.contact.title")}
            </Title>
            <Space orientation="vertical" size="middle">
              <Space>
                {MAIL_ICON}
                <Text type="secondary">info@example.com</Text>
              </Space>
              <Space>
                {PHONE_ICON}
                <Text type="secondary">+84 123 456 789</Text>
              </Space>
            </Space>
          </Col>
        </Row>

        <Divider className={styles.divider} />

        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">
              © {CURRENT_YEAR} {t("home.footer.copyright")}.{" "}
              {t("home.footer.rights")}
            </Text>
          </Col>
          <Col>
            <Space>
              <Link href="/privacy" className={styles.legalLink}>
                {t("home.footer.privacy")}
              </Link>
              <Text type="secondary">|</Text>
              <Link href="/terms" className={styles.legalLink}>
                {t("home.footer.terms")}
              </Link>
              <Text type="secondary">|</Text>
              <Link href="/pricing" className={styles.legalLink}>
                {t("home.footer.pricing")}
              </Link>
            </Space>
          </Col>
        </Row>
      </div>
    </AntFooter>
  );
};

export const Footer = memo(FooterComponent);

