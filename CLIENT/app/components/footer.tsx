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
import { memo, useMemo } from "react";
import { Spacing, FontSize } from "@/lib/constants/ui.constants";

const { Footer: AntFooter } = Layout;
const { Title, Text } = Typography;

const FooterComponent = () => {
  const { t } = useTranslation();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <AntFooter
      style={{
        background: "var(--ant-color-bg-container)",
        borderTop: "1px solid var(--ant-color-border-secondary)",
        padding: `${Spacing.XXXL}px ${Spacing.XL}px ${Spacing.XL}px`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Row gutter={[32, 32]}>
          {/* Company Info */}
          <Col xs={24} sm={12} md={6}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {t("home.footer.company.title")}
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              {t("home.footer.company.description")}
            </Text>
            <Space size="middle" style={{ marginTop: 16 }}>
              <a
                href="#"
                style={{ color: "var(--ant-color-text-secondary)" }}
                aria-label="Facebook"
              >
                <FacebookOutlined style={{ fontSize: 20 }} />
              </a>
              <a
                href="#"
                style={{ color: "var(--ant-color-text-secondary)" }}
                aria-label="Twitter"
              >
                <TwitterOutlined style={{ fontSize: 20 }} />
              </a>
              <a
                href="#"
                style={{ color: "var(--ant-color-text-secondary)" }}
                aria-label="Instagram"
              >
                <InstagramOutlined style={{ fontSize: 20 }} />
              </a>
              <a
                href="#"
                style={{ color: "var(--ant-color-text-secondary)" }}
                aria-label="LinkedIn"
              >
                <LinkedinOutlined style={{ fontSize: 20 }} />
              </a>
            </Space>
          </Col>

          {/* Quick Links */}
          <Col xs={24} sm={12} md={6}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {t("home.footer.links.title")}
            </Title>
            <Space orientation="vertical" size="small">
              <Link
                href="/"
                style={{ color: "var(--ant-color-text-secondary)", display: "block" }}
              >
                {t("home.nav.home")}
              </Link>
              <Link
                href="/#about"
                style={{ color: "var(--ant-color-text-secondary)", display: "block" }}
              >
                {t("home.nav.about")}
              </Link>
              <Link
                href="/#services"
                style={{ color: "var(--ant-color-text-secondary)", display: "block" }}
              >
                {t("home.nav.services")}
              </Link>
              <Link
                href="/#contact"
                style={{ color: "var(--ant-color-text-secondary)", display: "block" }}
              >
                {t("home.nav.contact")}
              </Link>
            </Space>
          </Col>

          {/* Services */}
          <Col xs={24} sm={12} md={6}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {t("home.footer.services.title")}
            </Title>
            <Space orientation="vertical" size="small">
              <Text type="secondary" style={{ display: "block" }}>
                {t("home.footer.services.item1")}
              </Text>
              <Text type="secondary" style={{ display: "block" }}>
                {t("home.footer.services.item2")}
              </Text>
              <Text type="secondary" style={{ display: "block" }}>
                {t("home.footer.services.item3")}
              </Text>
            </Space>
          </Col>

          {/* Contact */}
          <Col xs={24} sm={12} md={6}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {t("home.footer.contact.title")}
            </Title>
            <Space orientation="vertical" size="middle">
              <Space>
                <MailOutlined />
                <Text type="secondary">info@example.com</Text>
              </Space>
              <Space>
                <PhoneOutlined />
                <Text type="secondary">+84 123 456 789</Text>
              </Space>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: "32px 0" }} />

        {/* Copyright */}
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">
              © {currentYear} {t("home.footer.copyright")}.{" "}
              {t("home.footer.rights")}
            </Text>
          </Col>
          <Col>
            <Space>
              <Link
                href="/privacy"
                style={{ color: "var(--ant-color-text-secondary)" }}
              >
                {t("home.footer.privacy")}
              </Link>
              <Text type="secondary">|</Text>
              <Link
                href="/terms"
                style={{ color: "var(--ant-color-text-secondary)" }}
              >
                {t("home.footer.terms")}
              </Link>
            </Space>
          </Col>
        </Row>
      </div>
    </AntFooter>
  );
};

export const Footer = memo(FooterComponent);

