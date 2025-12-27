"use client";

import { Layout } from "antd";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { CategorySection } from "./components/category-section";
import { mockServices } from "./data/services.mock";
import { useTranslation } from "react-i18next";

const { Content } = Layout;

export default function Home() {
  const { t } = useTranslation();
  const assistanceServices = mockServices.filter(
    (s) => s.category === "ASSISTANCE"
  );
  const companionshipServices = mockServices.filter(
    (s) => s.category === "COMPANIONSHIP"
  );

  const personalAssistantServices = assistanceServices.filter(
    (s) => s.categoryCode === "PERSONAL_ASSISTANT"
  );
  const onSiteServices = assistanceServices.filter(
    (s) => s.categoryCode === "ON_SITE_PROFESSIONAL_ASSIST"
  );
  const virtualAssistantServices = assistanceServices.filter(
    (s) => s.categoryCode === "VIRTUAL_ASSISTANT"
  );
  const tourGuideServices = assistanceServices.filter(
    (s) => s.categoryCode === "TOUR_GUIDE"
  );
  const translatorServices = assistanceServices.filter(
    (s) => s.categoryCode === "TRANSLATOR"
  );
  const companionshipLevel1Services = companionshipServices.filter(
    (s) => s.categoryCode === "COMPANIONSHIP_LEVEL_1"
  );
  const companionshipLevel2Services = companionshipServices.filter(
    (s) => s.categoryCode === "COMPANIONSHIP_LEVEL_2"
  );
  const companionshipLevel3Services = companionshipServices.filter(
    (s) => s.categoryCode === "COMPANIONSHIP_LEVEL_3"
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <Header />

      <Content
        style={{ background: "#FFFFFF", maxWidth: "100%", overflowX: "hidden" }}
      >
        <section
          id="services"
          style={{
            padding: "80px 0 120px",
            background: "#FFFFFF",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          <CategorySection
            title={t("home.categories.assistance.title")}
            subtitle={t("home.categories.assistance.subtitle")}
            services={assistanceServices}
          />

          <CategorySection
            title={t("home.categories.personalAssistant.title")}
            services={personalAssistantServices}
          />

          <CategorySection
            title={t("home.categories.onSiteProfessional.title")}
            services={onSiteServices}
          />

          <CategorySection
            title={t("home.categories.virtualAssistant.title")}
            services={virtualAssistantServices}
          />

          <CategorySection
            title={t("home.categories.tourGuide.title")}
            services={tourGuideServices}
          />

          <CategorySection
            title={t("home.categories.translator.title")}
            services={translatorServices}
          />

          <CategorySection
            title={t("home.categories.companionship.title")}
            subtitle={t("home.categories.companionship.subtitle")}
            services={companionshipServices}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel1.title")}
            services={companionshipLevel1Services}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel2.title")}
            services={companionshipLevel2Services}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel3.title")}
            services={companionshipLevel3Services}
          />
        </section>
      </Content>

      <Footer />
    </Layout>
  );
}
