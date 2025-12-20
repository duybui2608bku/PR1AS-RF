"use client";

import { Layout, Typography, Button, Row, Col, Card, Space, Divider } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/**
 * Landing page trang chủ - Kết nối giữa Client và Worker
 */
export default function Home() {
  const { t } = useTranslation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header />

      <Content style={{ background: "var(--ant-color-bg-container)" }}>
        {/* Hero Section */}
        <section
          style={{
            padding: "80px 24px",
            background: "linear-gradient(135deg, var(--ant-color-primary) 0%, var(--ant-color-primary-active) 100%)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <Title
              level={1}
              style={{
                color: "#fff",
                fontSize: "clamp(32px, 5vw, 56px)",
                marginBottom: 24,
              }}
            >
              {t("home.hero.title")}
            </Title>
            <Paragraph
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 18,
                marginBottom: 32,
              }}
            >
              {t("home.hero.subtitle")}
            </Paragraph>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                style={{
                  background: "#fff",
                  color: "var(--ant-color-primary)",
                  borderColor: "#fff",
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                }}
                href="/auth/register"
              >
                {t("home.hero.getStarted")}
              </Button>
              <Button
                size="large"
                style={{
                  background: "transparent",
                  color: "#fff",
                  borderColor: "#fff",
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                }}
                href="/#services"
              >
                {t("home.hero.learnMore")}
              </Button>
            </Space>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="about"
          style={{
            padding: "80px 24px",
            background: "var(--ant-color-bg-container)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <Title level={2}>{t("home.features.title")}</Title>
              <Paragraph style={{ fontSize: 16, color: "var(--ant-color-text-secondary)" }}>
                {t("home.features.subtitle")}
              </Paragraph>
            </div>

            <Row gutter={[32, 32]}>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    textAlign: "center",
                  }}
                >
                  <UserOutlined
                    style={{
                      fontSize: 48,
                      color: "var(--ant-color-primary)",
                      marginBottom: 24,
                    }}
                  />
                  <Title level={4}>{t("home.features.client.title")}</Title>
                  <Paragraph type="secondary">
                    {t("home.features.client.description")}
                  </Paragraph>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    textAlign: "center",
                  }}
                >
                  <TeamOutlined
                    style={{
                      fontSize: 48,
                      color: "var(--ant-color-primary)",
                      marginBottom: 24,
                    }}
                  />
                  <Title level={4}>{t("home.features.worker.title")}</Title>
                  <Paragraph type="secondary">
                    {t("home.features.worker.description")}
                  </Paragraph>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    textAlign: "center",
                  }}
                >
                  <SafetyOutlined
                    style={{
                      fontSize: 48,
                      color: "var(--ant-color-primary)",
                      marginBottom: 24,
                    }}
                  />
                  <Title level={4}>{t("home.features.safe.title")}</Title>
                  <Paragraph type="secondary">
                    {t("home.features.safe.description")}
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        {/* Services Section */}
        <section
          id="services"
          style={{
            padding: "80px 24px",
            background: "var(--ant-color-fill-tertiary)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <Title level={2}>{t("home.services.title")}</Title>
              <Paragraph style={{ fontSize: 16, color: "var(--ant-color-text-secondary)" }}>
                {t("home.services.subtitle")}
              </Paragraph>
            </div>

            <Row gutter={[32, 32]}>
              <Col xs={24} md={12}>
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <CheckCircleOutlined
                      style={{
                        fontSize: 32,
                        color: "var(--ant-color-success)",
                      }}
                    />
                    <Title level={4}>{t("home.services.service1.title")}</Title>
                    <Paragraph>{t("home.services.service1.description")}</Paragraph>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <CheckCircleOutlined
                      style={{
                        fontSize: 32,
                        color: "var(--ant-color-success)",
                      }}
                    />
                    <Title level={4}>{t("home.services.service2.title")}</Title>
                    <Paragraph>{t("home.services.service2.description")}</Paragraph>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <CheckCircleOutlined
                      style={{
                        fontSize: 32,
                        color: "var(--ant-color-success)",
                      }}
                    />
                    <Title level={4}>{t("home.services.service3.title")}</Title>
                    <Paragraph>{t("home.services.service3.description")}</Paragraph>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <CheckCircleOutlined
                      style={{
                        fontSize: 32,
                        color: "var(--ant-color-success)",
                      }}
                    />
                    <Title level={4}>{t("home.services.service4.title")}</Title>
                    <Paragraph>{t("home.services.service4.description")}</Paragraph>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="contact"
          style={{
            padding: "80px 24px",
            background: "var(--ant-color-bg-container)",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <Title level={2}>{t("home.cta.title")}</Title>
            <Paragraph style={{ fontSize: 16, marginBottom: 32 }}>
              {t("home.cta.subtitle")}
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              href="/auth/register"
              style={{
                height: 48,
                paddingLeft: 32,
                paddingRight: 32,
              }}
            >
              {t("home.cta.button")}
            </Button>
          </div>
        </section>
      </Content>

      <Footer />
    </Layout>
  );
}
