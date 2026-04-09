"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LeftOutlined, RightOutlined, DownOutlined } from "@ant-design/icons";
import { SERVICE_CATEGORIES } from "@/app/constants/constants";
import styles from "./category-tabs.module.scss";

interface CategoryChild {
  code: string;
  icon: string;
  labelKey: string;
}

interface CategoryTab {
  code: string;
  icon: string;
  iconImage?: string;
  labelKey: string;
  children?: CategoryChild[];
}

const CATEGORY_TABS: CategoryTab[] = [
  {
    code: SERVICE_CATEGORIES.ASSISTANCE,
    icon: "🛎️",
    iconImage: "/icons/assistance-3d.svg",
    labelKey: "home.categories.assistance.title",
    children: [
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
    ],
  },
  {
    code: SERVICE_CATEGORIES.COMPANIONSHIP,
    icon: "🤝",
    iconImage: "/icons/companionship-3d.svg",
    labelKey: "home.categories.companionship.title",
    children: [
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
    ],
  },
];

// Helper: check if a category code belongs to a parent tab
const isChildActive = (tab: CategoryTab, activeCode: string): boolean => {
  if (tab.code === activeCode) return true;
  return tab.children?.some((child) => child.code === activeCode) ?? false;
};

enum ScrollConfig {
  AMOUNT = 300,
  THRESHOLD = 10,
}

interface CategoryTabsProps {
  forceCompact?: boolean;
  className?: string;
}

const CategoryTabsComponent = ({ forceCompact = false, className }: CategoryTabsProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [isCompactByScroll, setIsCompactByScroll] = useState(false);
  const [brokenIconCodes, setBrokenIconCodes] = useState<Set<string>>(new Set());
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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

  // Detect page scroll to toggle compact mode
  useEffect(() => {
    const COMPACT_ENTER_THRESHOLD = 120;
    const COMPACT_EXIT_THRESHOLD = 8;
    const handlePageScroll = () => {
      const currentScrollY = window.scrollY;
      setIsCompactByScroll((prev) => {
        if (!prev && currentScrollY > COMPACT_ENTER_THRESHOLD) return true;
        if (prev && currentScrollY < COMPACT_EXIT_THRESHOLD) return false;
        return prev;
      });
    };
    handlePageScroll(); // check initial state
    window.addEventListener("scroll", handlePageScroll, { passive: true });
    return () => window.removeEventListener("scroll", handlePageScroll);
  }, []);

  const handleScroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -ScrollConfig.AMOUNT : ScrollConfig.AMOUNT;
    el.scrollTo({ left: el.scrollLeft + offset, behavior: "smooth" });
  }, []);

  const updateDropdownPos = useCallback((tabCode: string) => {
    const btn = tabButtonRefs.current.get(tabCode);
    if (!btn || !btn.isConnected) return;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    // Clamp so dropdown doesn't go off-screen
    const minLeft = 110; // half of min-width (200) + padding
    const maxLeft = window.innerWidth - 110;
    setDropdownPos({
      left: Math.max(minLeft, Math.min(maxLeft, centerX)),
      top: rect.bottom + 8,
    });
  }, []);

  const handleTabClick = useCallback(
    (tab: CategoryTab) => {
      if (tab.children && tab.children.length > 0) {
        setOpenDropdown((prev) => {
          const next = prev === tab.code ? null : tab.code;
          if (next) updateDropdownPos(next);
          return next;
        });
      } else {
        router.push(`/services?category=${tab.code}`);
        setOpenDropdown(null);
      }
    },
    [router, updateDropdownPos]
  );

  const handleChildClick = useCallback(
    (code: string) => {
      router.push(`/services?category=${code}`);
      setOpenDropdown(null);
    },
    [router]
  );

  const handleMouseEnter = useCallback((tabCode: string, hasChildren: boolean) => {
    if (!hasChildren) return;
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    updateDropdownPos(tabCode);
    setOpenDropdown(tabCode);
  }, [updateDropdownPos]);

  const handleMouseLeave = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  }, []);

  // Keep dropdown anchored while layout is animating/scrolling.
  useEffect(() => {
    if (!openDropdown) return;

    let frameId = 0;
    let isActive = true;

    const syncDropdownPosition = () => {
      updateDropdownPos(openDropdown);
      if (!isActive) return;
      frameId = window.requestAnimationFrame(syncDropdownPosition);
    };

    syncDropdownPosition();

    const syncNow = () => updateDropdownPos(openDropdown);
    window.addEventListener("scroll", syncNow, { passive: true });
    window.addEventListener("resize", syncNow);

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", syncNow);
      window.removeEventListener("resize", syncNow);
    };
  }, [openDropdown, updateDropdownPos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.tabParent}`) && !target.closest(`.${styles.dropdownFixed}`)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className={`${styles.categoryTabsWrapper} ${forceCompact || isCompactByScroll ? styles.compact : ""} ${className ?? ""}`}>
      <div className={styles.categoryTabsInner}>
        <div
          className={`${styles.fadeMask} ${canScrollLeft ? styles.showLeftFade : ""} ${canScrollRight ? styles.showRightFade : ""}`}
        >
          <div className={styles.scrollWrapper}>
            <div ref={scrollRef} className={styles.scrollContainer}>
              {CATEGORY_TABS.map((tab) => {
                const hasChildren = !!(tab.children && tab.children.length > 0);
                const parentActive = isChildActive(tab, activeCategory);
                const isOpen = openDropdown === tab.code;

                return (
                  <div
                    key={tab.code}
                    className={styles.tabParent}
                    onMouseEnter={() => handleMouseEnter(tab.code, hasChildren)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      ref={(el) => {
                        if (el) {
                          tabButtonRefs.current.set(tab.code, el);
                        } else {
                          tabButtonRefs.current.delete(tab.code);
                        }
                      }}
                      className={`${styles.tab} ${parentActive ? styles.tabActive : ""} ${hasChildren ? styles.tabHasChildren : ""}`}
                      onClick={() => handleTabClick(tab)}
                      type="button"
                    >
                      {tab.iconImage && !brokenIconCodes.has(tab.code) ? (
                        <span className={styles.tabIconImage}>
                          <img
                            src={tab.iconImage}
                            alt={tab.code}
                            loading="lazy"
                            decoding="async"
                            onError={() => {
                              setBrokenIconCodes((prev) => {
                                const next = new Set(prev);
                                next.add(tab.code);
                                return next;
                              });
                            }}
                          />
                        </span>
                      ) : (
                        <span className={styles.tabIcon}>{tab.icon}</span>
                      )}
                      <span className={styles.tabLabel}>
                        {t(tab.labelKey)}
                        {hasChildren && (
                          <DownOutlined
                            className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ""}`}
                          />
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dropdown rendered outside scroll container with position:fixed */}
        {openDropdown && (() => {
          const tab = CATEGORY_TABS.find((t) => t.code === openDropdown);
          if (!tab?.children) return null;
          return (
            <>
              {/* Overlay for mobile tap-to-close */}
              <div
                className={styles.dropdownOverlay}
                onClick={() => setOpenDropdown(null)}
              />
              <div
                className={styles.dropdownFixed}
                style={{ left: dropdownPos.left, top: dropdownPos.top }}
                onMouseEnter={() => {
                  if (dropdownTimeoutRef.current) {
                    clearTimeout(dropdownTimeoutRef.current);
                    dropdownTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={handleMouseLeave}
              >
                {tab.children.map((child) => (
                  <button
                    key={child.code}
                    className={`${styles.dropdownItem} ${activeCategory === child.code ? styles.dropdownItemActive : ""}`}
                    onClick={() => handleChildClick(child.code)}
                    type="button"
                  >
                    <span className={styles.dropdownItemIcon}>{child.icon}</span>
                    <span className={styles.dropdownItemLabel}>{t(child.labelKey)}</span>
                  </button>
                ))}
              </div>
            </>
          );
        })()}

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
