"use client";

import { Layout, Typography, Divider } from "antd";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useTranslation } from "react-i18next";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function TermsOfUsePage() {
  const { t } = useTranslation();

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--ant-color-bg-container)" }}>
      <Header />

      <Content
        style={{
          background: "var(--ant-color-bg-container)",
          maxWidth: "100%",
          overflowX: "hidden",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Title level={1} style={{ marginBottom: 24, textAlign: "center" }}>
            {t("terms.title")}
          </Title>

          <Paragraph style={{ fontSize: 16, color: "var(--ant-color-text-secondary)", marginBottom: 32 }}>
            {t("terms.lastUpdated")}: {new Date().toLocaleDateString()}
          </Paragraph>

          <Divider />

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.acceptance.title")}</Title>
            <Paragraph>
              {t("terms.sections.acceptance.content1")}
            </Paragraph>
            <Paragraph>
              {t("terms.sections.acceptance.content2")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.definitions.title")}</Title>
            <ul>
              <li>{t("terms.sections.definitions.items.platform")}</li>
              <li>{t("terms.sections.definitions.items.company")}</li>
              <li>{t("terms.sections.definitions.items.user")}</li>
              <li>{t("terms.sections.definitions.items.client")}</li>
              <li>{t("terms.sections.definitions.items.worker")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.registration.title")}</Title>
            <Title level={3}>{t("terms.sections.registration.requirements.title")}</Title>
            <Paragraph>
              {t("terms.sections.registration.requirements.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.registration.requirements.items.accurate")}</li>
              <li>{t("terms.sections.registration.requirements.items.maintain")}</li>
              <li>{t("terms.sections.registration.requirements.items.security")}</li>
              <li>{t("terms.sections.registration.requirements.items.responsibility")}</li>
              <li>{t("terms.sections.registration.requirements.items.notify")}</li>
            </ul>

            <Title level={3}>{t("terms.sections.registration.eligibility.title")}</Title>
            <Paragraph>
              {t("terms.sections.registration.eligibility.description")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.usage.title")}</Title>
            <Title level={3}>{t("terms.sections.usage.rights.title")}</Title>
            <Paragraph>
              {t("terms.sections.usage.rights.description")}
            </Paragraph>

            <Title level={3}>{t("terms.sections.usage.prohibited.title")}</Title>
            <Paragraph>{t("terms.sections.usage.prohibited.description")}</Paragraph>
            <ul>
              <li>{t("terms.sections.usage.prohibited.items.illegal")}</li>
              <li>{t("terms.sections.usage.prohibited.items.violate")}</li>
              <li>{t("terms.sections.usage.prohibited.items.infringe")}</li>
              <li>{t("terms.sections.usage.prohibited.items.content")}</li>
              <li>{t("terms.sections.usage.prohibited.items.spam")}</li>
              <li>{t("terms.sections.usage.prohibited.items.access")}</li>
              <li>{t("terms.sections.usage.prohibited.items.automation")}</li>
              <li>{t("terms.sections.usage.prohibited.items.copy")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.services.title")}</Title>
            <Title level={3}>{t("terms.sections.services.worker.title")}</Title>
            <Paragraph>
              {t("terms.sections.services.worker.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.services.worker.items.accurate")}</li>
              <li>{t("terms.sections.services.worker.items.professional")}</li>
              <li>{t("terms.sections.services.worker.items.comply")}</li>
              <li>{t("terms.sections.services.worker.items.tax")}</li>
              <li>{t("terms.sections.services.worker.items.illegal")}</li>
            </ul>

            <Title level={3}>{t("terms.sections.services.client.title")}</Title>
            <Paragraph>
              {t("terms.sections.services.client.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.services.client.items.payment")}</li>
              <li>{t("terms.sections.services.client.items.respect")}</li>
              <li>{t("terms.sections.services.client.items.accurate")}</li>
              <li>{t("terms.sections.services.client.items.illegal")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.payment.title")}</Title>
            <Paragraph>
              {t("terms.sections.payment.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.payment.items.pay")}</li>
              <li>{t("terms.sections.payment.items.accurate")}</li>
              <li>{t("terms.sections.payment.items.fees")}</li>
              <li>{t("terms.sections.payment.items.refund")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.intellectual.title")}</Title>
            <Paragraph>
              {t("terms.sections.intellectual.content1")}
            </Paragraph>
            <Paragraph>
              {t("terms.sections.intellectual.content2")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.userContent.title")}</Title>
            <Title level={3}>{t("terms.sections.userContent.ownership.title")}</Title>
            <Paragraph>
              {t("terms.sections.userContent.ownership.description")}
            </Paragraph>

            <Title level={3}>{t("terms.sections.userContent.responsibility.title")}</Title>
            <Paragraph>
              {t("terms.sections.userContent.responsibility.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.userContent.responsibility.items.rights")}</li>
              <li>{t("terms.sections.userContent.responsibility.items.laws")}</li>
              <li>{t("terms.sections.userContent.responsibility.items.misleading")}</li>
              <li>{t("terms.sections.userContent.responsibility.items.offensive")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.disclaimer.title")}</Title>
            <Paragraph>
              {t("terms.sections.disclaimer.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.disclaimer.items.uninterrupted")}</li>
              <li>{t("terms.sections.disclaimer.items.errors")}</li>
              <li>{t("terms.sections.disclaimer.items.viruses")}</li>
            </ul>
            <Paragraph>
              {t("terms.sections.disclaimer.liability")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.limitation.title")}</Title>
            <Paragraph>
              {t("terms.sections.limitation.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.limitation.items.profits")}</li>
              <li>{t("terms.sections.limitation.items.indirect")}</li>
              <li>{t("terms.sections.limitation.items.use")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.indemnification.title")}</Title>
            <Paragraph>
              {t("terms.sections.indemnification.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.indemnification.items.use")}</li>
              <li>{t("terms.sections.indemnification.items.violation")}</li>
              <li>{t("terms.sections.indemnification.items.rights")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.termination.title")}</Title>
            <Paragraph>
              {t("terms.sections.termination.content1")}
            </Paragraph>
            <Paragraph>
              {t("terms.sections.termination.content2")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.governing.title")}</Title>
            <Paragraph>
              {t("terms.sections.governing.description")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("terms.sections.contact.title")}</Title>
            <Paragraph>
              {t("terms.sections.contact.description")}
            </Paragraph>
            <ul>
              <li>{t("terms.sections.contact.email")}</li>
              <li>{t("terms.sections.contact.phone")}</li>
              <li>{t("terms.sections.contact.address")}</li>
            </ul>
          </section>

          <Divider />

          <Paragraph style={{ fontSize: 14, color: "var(--ant-color-text-tertiary)", textAlign: "center" }}>
            {t("terms.sections.effectiveDate")} {new Date().toLocaleDateString()}
          </Paragraph>
        </div>
      </Content>

      <Footer />
    </Layout>
  );
}
