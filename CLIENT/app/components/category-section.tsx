"use client";

import { Typography, Button, Space } from "antd";
import {
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Service } from "../data/services.mock";
import { ServiceCard } from "./service-card";

const { Title } = Typography;

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  services: Service[];
  showViewAll?: boolean;
}

export function CategorySection({
  title,
  subtitle,
  services,
  showViewAll = true,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? currentScroll - scrollAmount
          : currentScroll + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  };

  if (services.length === 0) return null;

  return (
    <section style={{ marginBottom: 80, width: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px",
          maxWidth: "1400px",
          margin: "0 auto 24px",
          width: "100%",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Title
              level={2}
              style={{
                fontSize: "clamp(22px, 3vw, 28px)",
                fontWeight: 700,
                color: "#711111",
                margin: 0,
              }}
            >
              {title}
            </Title>
            {showViewAll && (
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
                style={{
                  padding: 0,
                  height: "auto",
                  color: "#1D1D1F",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {t("home.viewAll")}
              </Button>
            )}
          </div>
          {subtitle && (
            <p style={{ margin: "8px 0 0", color: "#6E6E73", fontSize: 16 }}>
              {subtitle}
            </p>
          )}
        </div>

        {services.length > 3 && (
          <Space size={8} style={{ marginLeft: 24, flexShrink: 0 }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => scroll("left")}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid #E5E5E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 50ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1D1D1F";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E5E5";
                e.currentTarget.style.transform = "scale(1)";
              }}
            />
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => scroll("right")}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid #E5E5E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 50ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1D1D1F";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E5E5";
                e.currentTarget.style.transform = "scale(1)";
              }}
            />
          </Space>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        style={{
          display: "flex",
          gap: "24px",
          overflowX: "auto",
          overflowY: "hidden",
          padding: "0 24px",
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
        }}
        className="category-scroll-container"
      >
        {services.map((service) => (
          <div
            key={service.id}
            style={{
              flex: "0 0 320px",
              minWidth: 0,
            }}
          >
            <ServiceCard service={service} size="medium" />
          </div>
        ))}
      </div>
    </section>
  );
}
