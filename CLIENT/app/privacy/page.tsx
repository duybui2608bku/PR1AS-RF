"use client";

import { Layout, Typography, Divider } from "antd";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { useTranslation } from "react-i18next";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function PrivacyPolicyPage() {
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
            {t("privacy.title")}
          </Title>

          <Paragraph style={{ fontSize: 16, color: "var(--ant-color-text-secondary)", marginBottom: 32 }}>
            {t("privacy.lastUpdated")}: {new Date().toLocaleDateString()}
          </Paragraph>

          <Divider />

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.introduction.title")}</Title>
            <Paragraph>
              {t("privacy.sections.introduction.content1")}
            </Paragraph>
            <Paragraph>
              {t("privacy.sections.introduction.content2")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.informationCollection.title")}</Title>
            
            <Title level={3}>{t("privacy.sections.informationCollection.providedInfo.title")}</Title>
            <Paragraph>
              {t("privacy.sections.informationCollection.providedInfo.description")}
            </Paragraph>
            <ul>
              <li>{t("privacy.sections.informationCollection.providedInfo.items.personal")}</li>
              <li>{t("privacy.sections.informationCollection.providedInfo.items.payment")}</li>
              <li>{t("privacy.sections.informationCollection.providedInfo.items.profile")}</li>
              <li>{t("privacy.sections.informationCollection.providedInfo.items.address")}</li>
            </ul>

            <Title level={3}>{t("privacy.sections.informationCollection.autoInfo.title")}</Title>
            <Paragraph>
              {t("privacy.sections.informationCollection.autoInfo.description")}
            </Paragraph>
            <ul>
              <li>{t("privacy.sections.informationCollection.autoInfo.items.device")}</li>
              <li>{t("privacy.sections.informationCollection.autoInfo.items.usage")}</li>
              <li>{t("privacy.sections.informationCollection.autoInfo.items.cookies")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.informationUse.title")}</Title>
            <Paragraph>{t("privacy.sections.informationUse.description")}</Paragraph>
            <ul>
              <li>{t("privacy.sections.informationUse.items.provide")}</li>
              <li>{t("privacy.sections.informationUse.items.process")}</li>
              <li>{t("privacy.sections.informationUse.items.marketing")}</li>
              <li>{t("privacy.sections.informationUse.items.detect")}</li>
              <li>{t("privacy.sections.informationUse.items.comply")}</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.informationSharing.title")}</Title>
            <Paragraph>
              {t("privacy.sections.informationSharing.description")}
            </Paragraph>
            <ul>
              <li>
                <strong>{t("privacy.sections.informationSharing.items.users").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.informationSharing.items.users").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.informationSharing.items.providers").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.informationSharing.items.providers").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.informationSharing.items.legal").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.informationSharing.items.legal").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.informationSharing.items.business").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.informationSharing.items.business").split(":")[1]}
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.security.title")}</Title>
            <Paragraph>
              {t("privacy.sections.security.description")}
            </Paragraph>
            <ul>
              <li>{t("privacy.sections.security.items.encryption")}</li>
              <li>{t("privacy.sections.security.items.access")}</li>
              <li>{t("privacy.sections.security.items.monitoring")}</li>
              <li>{t("privacy.sections.security.items.training")}</li>
            </ul>
            <Paragraph>
              {t("privacy.sections.security.disclaimer")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.rights.title")}</Title>
            <Paragraph>{t("privacy.sections.rights.description")}</Paragraph>
            <ul>
              <li>
                <strong>{t("privacy.sections.rights.items.access").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.rights.items.access").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.rights.items.edit").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.rights.items.edit").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.rights.items.delete").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.rights.items.delete").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.rights.items.optout").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.rights.items.optout").split(":")[1]}
              </li>
              <li>
                <strong>{t("privacy.sections.rights.items.portability").split(":")[0]}:</strong>{" "}
                {t("privacy.sections.rights.items.portability").split(":")[1]}
              </li>
            </ul>
            <Paragraph>
              {t("privacy.sections.rights.contact")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.cookies.title")}</Title>
            <Paragraph>
              {t("privacy.sections.cookies.description")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.children.title")}</Title>
            <Paragraph>
              {t("privacy.sections.children.description")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.changes.title")}</Title>
            <Paragraph>
              {t("privacy.sections.changes.description")}
            </Paragraph>
          </section>

          <section style={{ marginBottom: 32 }}>
            <Title level={2}>{t("privacy.sections.contact.title")}</Title>
            <Paragraph>
              {t("privacy.sections.contact.description")}
            </Paragraph>
            <ul>
              <li>{t("privacy.sections.contact.email")}</li>
              <li>{t("privacy.sections.contact.phone")}</li>
              <li>{t("privacy.sections.contact.address")}</li>
            </ul>
          </section>

          <Divider />

          <Paragraph style={{ fontSize: 14, color: "var(--ant-color-text-tertiary)", textAlign: "center" }}>
            {t("privacy.sections.effectiveDate")} {new Date().toLocaleDateString()}
          </Paragraph>
        </div>
      </Content>

      <Footer />
    </Layout>
  );
}

