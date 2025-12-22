"use client";

import { Layout } from "antd";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { CategorySection } from "./components/category-section";
import { mockServices } from "./data/services.mock";

const { Content } = Layout;

/**
 * Landing page trang chủ - Marketplace dịch vụ lấy cảm hứng từ Airbnb
 */
export default function Home() {
  // Group services by category
  const assistanceServices = mockServices.filter(
    (s) => s.category === "ASSISTANCE"
  );
  const companionshipServices = mockServices.filter(
    (s) => s.category === "COMPANIONSHIP"
  );

  // Group by category code
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
        {/* Services Section - Category Sections */}
        <section
          id="services"
          style={{
            padding: "80px 0 120px",
            background: "#FFFFFF",
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          {/* ASSISTANCE Category */}
          <CategorySection
            title="Dịch vụ hỗ trợ"
            subtitle="Các dịch vụ hỗ trợ chuyên nghiệp"
            services={assistanceServices}
          />

          {/* Personal Assistant */}
          <CategorySection
            title="Trợ lý cá nhân"
            services={personalAssistantServices}
          />

          {/* On-site Professional Assist */}
          <CategorySection
            title="Hỗ trợ chuyên môn tại chỗ"
            services={onSiteServices}
          />

          {/* Virtual Assistant */}
          <CategorySection
            title="Trợ lý ảo"
            services={virtualAssistantServices}
          />

          {/* Tour Guide */}
          <CategorySection
            title="Hướng dẫn viên du lịch"
            services={tourGuideServices}
          />

          {/* Translator */}
          <CategorySection title="Phiên dịch" services={translatorServices} />

          {/* COMPANIONSHIP Category */}
          <CategorySection
            title="Dịch vụ đồng hành"
            subtitle="Các dịch vụ đồng hành theo nhiều cấp độ"
            services={companionshipServices}
          />

          {/* Companionship Level 1 */}
          <CategorySection
            title="Đồng hành cấp 1"
            services={companionshipLevel1Services}
          />

          {/* Companionship Level 2 */}
          <CategorySection
            title="Đồng hành cấp 2"
            services={companionshipLevel2Services}
          />

          {/* Companionship Level 3 */}
          <CategorySection
            title="Đồng hành cấp 3"
            services={companionshipLevel3Services}
          />
        </section>
      </Content>

      <Footer />
    </Layout>
  );
}
