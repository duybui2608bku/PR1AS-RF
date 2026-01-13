"use client";

import { Typography, Button, Space } from "antd";
import {
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRef, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Service } from "../data/services.mock";
import { ServiceCard } from "./service-card";
import { ScrollAmount, Spacing, BorderRadius, TransitionDuration } from "@/lib/constants/ui.constants";

const { Title } = Typography;

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  services: Service[];
  showViewAll?: boolean;
}

const CategorySectionComponent = ({
  title,
  subtitle,
  services,
  showViewAll = true,
}: CategorySectionProps) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? currentScroll - ScrollAmount.CATEGORY_SECTION
          : currentScroll + ScrollAmount.CATEGORY_SECTION;

      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  }, []);

  const handleScrollLeft = useCallback(() => scroll("left"), [scroll]);
  const handleScrollRight = useCallback(() => scroll("right"), [scroll]);

  const showScrollButtons = useMemo(() => services.length > 3, [services.length]);

  const buttonStyle = useMemo(() => ({
    width: 40,
    height: 40,
    borderRadius: `${BorderRadius.CIRCLE}%`,
    border: "1px solid #E5E5E5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: `all ${TransitionDuration.FAST}ms ease-out`,
  }), []);

  const handleButtonMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = "#1D1D1F";
    e.currentTarget.style.transform = "scale(1.05)";
  }, []);

  const handleButtonMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = "#E5E5E5";
    e.currentTarget.style.transform = "scale(1)";
  }, []);

  if (services.length === 0) return null;

  return (
    <section style={{ marginBottom: 80, width: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `0 ${Spacing.XL}px`,
          maxWidth: "1400px",
          margin: `0 auto ${Spacing.XL}px`,
          width: "100%",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: Spacing.MD }}>
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
                iconPosition="end"
                style={{
                  padding: 0,
                  height: "auto",
                  color: "#1D1D1F",
                  fontSize: Spacing.LG,
                  fontWeight: 500,
                }}
              >
                {t("home.viewAll")}
              </Button>
            )}
          </div>
          {subtitle && (
            <p style={{ margin: `${Spacing.SM}px 0 0`, color: "#6E6E73", fontSize: Spacing.LG }}>
              {subtitle}
            </p>
          )}
        </div>

        {showScrollButtons && (
          <Space size={Spacing.SM} style={{ marginLeft: Spacing.XL, flexShrink: 0 }}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={handleScrollLeft}
              style={buttonStyle}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
            />
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={handleScrollRight}
              style={buttonStyle}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
            />
          </Space>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        style={{
          display: "flex",
          gap: `${Spacing.XL}px`,
          overflowX: "auto",
          overflowY: "hidden",
          padding: `0 ${Spacing.XL}px`,
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
};

export const CategorySection = memo(CategorySectionComponent);
