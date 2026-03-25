"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { SERVICE_CATEGORIES } from "@/app/constants/constants";
import styles from "./category-tabs.module.scss";

interface CategoryTab {
  code: string;
  icon: string;
  labelKey: string;
}

const CATEGORY_TABS: CategoryTab[] = [
  {
    code: SERVICE_CATEGORIES.ASSISTANCE,
    icon: "🛎️",
    labelKey: "home.categories.assistance.title",
  },
  {
    code: SERVICE_CATEGORIES.PERSONAL_ASSISTANT,
    icon: "💼",
    labelKey: "home.categories.personalAssistant.title",
  },
  {
    code: SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST,
    icon: "🏢",
    labelKey: "home.categories.onSiteProfessional.title",
  },
  {
    code: SERVICE_CATEGORIES.VIRTUAL_ASSISTANT,
    icon: "💻",
    labelKey: "home.categories.virtualAssistant.title",
  },
  {
    code: SERVICE_CATEGORIES.TOUR_GUIDE,
    icon: "🗺️",
    labelKey: "home.categories.tourGuide.title",
  },
  {
    code: SERVICE_CATEGORIES.TRANSLATOR,
    icon: "🌐",
    labelKey: "home.categories.translator.title",
  },
  {
    code: SERVICE_CATEGORIES.COMPANIONSHIP,
    icon: "🤝",
    labelKey: "home.categories.companionship.title",
  },
  {
    code: SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1,
    icon: "☕",
    labelKey: "home.categories.companionshipLevel1.title",
  },
  {
    code: SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2,
    icon: "🌟",
    labelKey: "home.categories.companionshipLevel2.title",
  },
  {
    code: SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_3,
    icon: "👑",
    labelKey: "home.categories.companionshipLevel3.title",
  },
];

enum ScrollConfig {
  AMOUNT = 300,
  THRESHOLD = 10,
}

const CategoryTabsComponent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const activeCategory = pathname === "/services" 
    ? searchParams.get("category") || "" 
    : "";

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > ScrollConfig.THRESHOLD);
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - ScrollConfig.THRESHOLD
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const handleScroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -ScrollConfig.AMOUNT : ScrollConfig.AMOUNT;
    el.scrollTo({ left: el.scrollLeft + offset, behavior: "smooth" });
  }, []);

  const handleTabClick = useCallback(
    (code: string) => {
      router.push(`/services?category=${code}`);
    },
    [router]
  );

  return (
    <div className={styles.categoryTabsWrapper}>
      <div className={styles.categoryTabsInner}>
        <div
          className={`${styles.fadeMask} ${canScrollLeft ? styles.showLeftFade : ""} ${canScrollRight ? styles.showRightFade : ""}`}
        >
          <div className={styles.scrollWrapper}>
            <div ref={scrollRef} className={styles.scrollContainer}>
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.code}
                  className={`${styles.tab} ${activeCategory === tab.code ? styles.tabActive : ""}`}
                  onClick={() => handleTabClick(tab.code)}
                  type="button"
                >
                  <span className={styles.tabIcon}>{tab.icon}</span>
                  <span className={styles.tabLabel}>{t(tab.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {canScrollLeft && (
          <button
            className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`}
            onClick={() => handleScroll("left")}
            type="button"
            aria-label="Scroll left"
          >
            <LeftOutlined style={{ fontSize: 10 }} />
          </button>
        )}

        {canScrollRight && (
          <button
            className={`${styles.scrollBtn} ${styles.scrollBtnRight}`}
            onClick={() => handleScroll("right")}
            type="button"
            aria-label="Scroll right"
          >
            <RightOutlined style={{ fontSize: 10 }} />
          </button>
        )}
      </div>
    </div>
  );
};

export const CategoryTabs = memo(CategoryTabsComponent);
