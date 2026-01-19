"use client";

import { Layout } from "antd";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { CategorySection } from "./components/category-section";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { workerServicesApi } from "@/lib/api/worker.api";
import { transformWorkersGroupedByServiceToServices } from "@/lib/utils/service-transform.utils";
import { useMemo } from "react";
import { SERVICE_CATEGORIES } from "./constants/constants";

const { Content } = Layout;

export default function Home() {
  const { t, i18n } = useTranslation();

  const { data: workersGroupedByService, isLoading } = useQuery({
    queryKey: ["workers-grouped-by-service"],
    queryFn: () => workerServicesApi.getWorkersGroupedByService(),
  });

  const allServices = useMemo(() => {
    if (!workersGroupedByService) return [];
    const locale = i18n.language;
    return transformWorkersGroupedByServiceToServices(
      workersGroupedByService,
      locale
    );
  }, [workersGroupedByService, i18n.language]);

  const assistanceServices = useMemo(
    () => allServices.filter((s) => s.category === SERVICE_CATEGORIES.ASSISTANCE),
    [allServices]
  );

  const companionshipServices = useMemo(
    () => allServices.filter((s) => s.category === SERVICE_CATEGORIES.COMPANIONSHIP),
    [allServices]
  );

  const personalAssistantServices = useMemo(
    () =>
      assistanceServices.filter((s) => s.categoryCode === SERVICE_CATEGORIES.PERSONAL_ASSISTANT),
    [assistanceServices]
  );

  const onSiteServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST
      ),
    [assistanceServices]
  );

  const virtualAssistantServices = useMemo(
    () =>
      assistanceServices.filter((s) => s.categoryCode === SERVICE_CATEGORIES.VIRTUAL_ASSISTANT),
    [assistanceServices]
  );

  const tourGuideServices = useMemo(
    () => assistanceServices.filter((s) => s.categoryCode === SERVICE_CATEGORIES.TOUR_GUIDE),
    [assistanceServices]
  );

  const translatorServices = useMemo(
    () => assistanceServices.filter((s) => s.categoryCode === SERVICE_CATEGORIES.TRANSLATOR),
    [assistanceServices]
  );

  const companionshipLevel1Services = useMemo(
    () =>
      companionshipServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1
      ),
    [companionshipServices]
  );

  const companionshipLevel2Services = useMemo(
    () =>
      companionshipServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2
      ),
    [companionshipServices]
  );

  const companionshipLevel3Services = useMemo(
    () =>
      companionshipServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_3
      ),
    [companionshipServices]
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--background)" }}>
      <Header />
      <Content
        style={{
          background: "var(--background)",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <section
          id="services"
          style={{
            padding: "80px 0 120px",
            background: "var(--background)",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          <CategorySection
            title={t("home.categories.assistance.title")}
            subtitle={t("home.categories.assistance.subtitle")}
            services={assistanceServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.personalAssistant.title")}
            services={personalAssistantServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.onSiteProfessional.title")}
            services={onSiteServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.virtualAssistant.title")}
            services={virtualAssistantServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.tourGuide.title")}
            services={tourGuideServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.translator.title")}
            services={translatorServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.companionship.title")}
            subtitle={t("home.categories.companionship.subtitle")}
            services={companionshipServices}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel1.title")}
            services={companionshipLevel1Services}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel2.title")}
            services={companionshipLevel2Services}
            isLoading={isLoading}
          />

          <CategorySection
            title={t("home.categories.companionshipLevel3.title")}
            services={companionshipLevel3Services}
            isLoading={isLoading}
          />
        </section>
      </Content>
      <Footer />
    </Layout>
  );
}
