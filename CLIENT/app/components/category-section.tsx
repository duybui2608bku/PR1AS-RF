"use client";

import { Button, Space, Row, Col } from "antd";
import {
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRef, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Service } from "../data/services.mock";
import { ServiceCard } from "./service-card";
import { ServiceCardSkeleton } from "@/lib/components/skeletons";
import { ScrollAmount, Spacing } from "@/lib/constants/ui.constants";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import styles from "./category-section.module.scss";

enum SkeletonCount {
  DEFAULT = 4,
}

enum PrimaryWorkerIndex {
  FIRST = 0,
}

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  services: Service[];
  showViewAll?: boolean;
  isLoading?: boolean;
}

const CategorySectionComponent = ({
  title,
  subtitle,
  services,
  showViewAll = true,
  isLoading = false,
}: CategorySectionProps) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const handleServiceClick = useCallback(
    (service: Service) => {
      if (!service.users || service.users.length === 0) {
        return;
      }
      const primaryUser = service.users[PrimaryWorkerIndex.FIRST];
      if (!primaryUser?.id) {
        return;
      }
      router.push(buildWorkerProfileRoute(primaryUser.id));
    },
    [router]
  );

  if (!isLoading && services.length === 0) return null;

  return (
    <section className={styles.section}>
      <Row className={styles.headerRow} justify="space-between" align="middle">
        <Col flex={1} className={styles.titleCol}>
          <Space className={styles.titleRow} size={Spacing.MD}>
            <h2 className={styles.title}>{title}</h2>
            {showViewAll && (
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
                className={styles.viewAllButton}
              >
                {t("home.viewAll")}
              </Button>
            )}
          </Space>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </Col>
        {showScrollButtons && (
          <Col flex="none">
            <Space size={Spacing.SM} className={styles.scrollButtons}>
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={handleScrollLeft}
                className={styles.scrollButton}
              />
              <Button
                type="text"
                icon={<RightOutlined />}
                onClick={handleScrollRight}
                className={styles.scrollButton}
              />
            </Space>
          </Col>
        )}
      </Row>

      <div
        ref={scrollContainerRef}
        className={styles.scrollContainer}
      >
        {isLoading
          ? Array.from({ length: SkeletonCount.DEFAULT }).map((_, index) => (
              <div key={index} className={styles.cardSlot}>
                <ServiceCardSkeleton size="medium" />
              </div>
            ))
          : services.map((service) => (
              <div key={service.id} className={styles.cardSlot}>
                <ServiceCard
                  service={service}
                  size="medium"
                  onClick={() => handleServiceClick(service)}
                />
              </div>
            ))}
      </div>
    </section>
  );
};

export const CategorySection = memo(CategorySectionComponent);
