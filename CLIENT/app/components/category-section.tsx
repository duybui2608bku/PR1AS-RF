"use client";

import { Button, Carousel, Row, Col, Typography } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import {
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRef, memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { ServiceListing } from "@/lib/types/service-listing";
import { ServiceCard } from "./service-card";
import { ServiceCardSkeleton } from "@/lib/components/skeletons";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import { Breakpoint } from "@/lib/constants/ui.constants";
import { useWindowSize } from "@/lib/hooks/use-window-size";
import styles from "./category-section.module.scss";

const { Title, Paragraph } = Typography;

enum SkeletonCount {
  DEFAULT = 4,
}

enum PrimaryWorkerIndex {
  FIRST = 0,
}

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  services: ServiceListing[];
  showViewAll?: boolean;
  isLoading?: boolean;
  categoryCode?: string;
  eyebrow?: string;
}

const useSlidesToShow = () => {
  const { width } = useWindowSize();
  if (!width) return 4;
  if (width < Breakpoint.MOBILE) return 1;
  if (width < Breakpoint.TABLET) return 2;
  if (width < Breakpoint.DESKTOP) return 3;
  return 4;
};

const CategorySectionComponent = ({
  title,
  subtitle,
  services,
  showViewAll = true,
  isLoading = false,
  categoryCode,
  eyebrow,
}: CategorySectionProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const carouselRef = useRef<CarouselRef>(null);
  const slidesToShow = useSlidesToShow();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { width } = useWindowSize();
  const isMobile = (width ?? 0) < Breakpoint.MOBILE;

  const items = useMemo<(ServiceListing | null)[]>(
    () =>
      isLoading
        ? Array.from({ length: SkeletonCount.DEFAULT }, () => null)
        : services,
    [isLoading, services]
  );

  const showArrows = useMemo(
    () => items.length > slidesToShow,
    [items.length, slidesToShow]
  );

  const clampedCurrentSlide = Math.min(
    currentSlide,
    Math.max(0, items.length - slidesToShow)
  );
  const canScrollPrev = clampedCurrentSlide > 0;
  const canScrollNext = clampedCurrentSlide < items.length - slidesToShow;

  const handlePrev = useCallback(() => {
    carouselRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    carouselRef.current?.next();
  }, []);

  const handleServiceClick = useCallback(
    (service: ServiceListing) => {
      if (!service.users || service.users.length === 0) return;
      const primaryUser = service.users[PrimaryWorkerIndex.FIRST];
      if (!primaryUser?.id) return;
      router.push(buildWorkerProfileRoute(primaryUser.id));
    },
    [router]
  );

  if (!isLoading && services.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Row
          className={styles.headerRow}
          justify="space-between"
          align="bottom"
        >
          <Col className={styles.titleCol}>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <div className={styles.titleRow}>
              <Title level={2} className={styles.title}>
                {title}
              </Title>
              {showViewAll && categoryCode && (
                <Button
                  type="link"
                  icon={<ArrowRightOutlined />}
                  iconPosition="end"
                  className={styles.viewAllButton}
                  onClick={() =>
                    router.push(`/services?category=${categoryCode}`)
                  }
                >
                  {t("home.viewAll")}
                </Button>
              )}
            </div>
            {subtitle && (
              <Paragraph className={styles.subtitle}>{subtitle}</Paragraph>
            )}
          </Col>

          {showArrows && (
            <Col flex="none">
              <div className={styles.scrollButtons}>
                <Button
                  type="default"
                  shape="circle"
                  icon={<LeftOutlined />}
                  onClick={handlePrev}
                  disabled={!canScrollPrev}
                  className={styles.scrollButton}
                  aria-label="Previous"
                />
                <Button
                  type="default"
                  shape="circle"
                  icon={<RightOutlined />}
                  onClick={handleNext}
                  disabled={!canScrollNext}
                  className={styles.scrollButton}
                  aria-label="Next"
                />
              </div>
            </Col>
          )}
        </Row>

        <div className={styles.carouselViewport}>
          <Carousel
            ref={carouselRef}
            slidesToShow={slidesToShow}
            slidesToScroll={1}
            infinite={false}
            dots={isMobile}
            arrows={false}
            draggable
            swipeToSlide
            beforeChange={(_from, to) => setCurrentSlide(to)}
            key={`carousel-${slidesToShow}`}
          >
            {items.map((service, index) =>
              service === null ? (
                <div key={`sk-${index}`}>
                  <ServiceCardSkeleton size="medium" />
                </div>
              ) : (
                <div key={service.id}>
                  <ServiceCard
                    service={service}
                    size="medium"
                    onClick={() => handleServiceClick(service)}
                  />
                </div>
              )
            )}
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export const CategorySection = memo(CategorySectionComponent);
