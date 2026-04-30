"use client";

import { AutoComplete, Button, DatePicker, Input, message } from "antd";
import {
  EnvironmentOutlined,
  MonitorOutlined,
  SearchOutlined,
  AppstoreOutlined,
  CompassOutlined,
  TranslationOutlined,
  HeartOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { Dayjs } from "dayjs";
import { memo, useCallback, useEffect, useState } from "react";
import { SERVICE_CATEGORIES } from "@/app/constants/constants";
import {
  workerServicesApi,
  type LocationSuggestionLanguage,
} from "@/lib/api/worker.api";
import styles from "./hero.module.scss";

interface HeroCategoryChip {
  key: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
}

interface LocationAutoCompleteOption {
  value: string;
  label: React.ReactNode;
  coords: string;
}

const HERO_CATEGORIES: HeroCategoryChip[] = [
  {
    key: "ALL",
    labelKey: "common.all",
    defaultLabel: "Tất cả",
    icon: <AppstoreOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST,
    labelKey: "home.categories.onSiteProfessional.title",
    defaultLabel: "Trợ lý tại chỗ",
    icon: <EnvironmentOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.VIRTUAL_ASSISTANT,
    labelKey: "home.categories.virtualAssistant.title",
    defaultLabel: "Trợ lý ảo",
    icon: <MonitorOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.TOUR_GUIDE,
    labelKey: "home.categories.tourGuide.title",
    defaultLabel: "Hướng dẫn viên du lịch",
    icon: <CompassOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.TRANSLATOR,
    labelKey: "home.categories.translator.title",
    defaultLabel: "Phiên dịch",
    icon: <TranslationOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1,
    labelKey: "home.categories.companionshipLevel1.title",
    defaultLabel: "Đồng hành cấp 1",
    icon: <HeartOutlined />,
  },
  {
    key: SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2,
    labelKey: "home.categories.companionshipLevel2.title",
    defaultLabel: "Đồng hành cấp 2",
    icon: <StarOutlined />,
  },
];

const HeroComponent = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocationCoords, setSelectedLocationCoords] = useState("");
  const [locationOptions, setLocationOptions] = useState<
    LocationAutoCompleteOption[]
  >([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationFetchFailed, setLocationFetchFailed] = useState(false);
  const [scheduleValue, setScheduleValue] = useState<Dayjs | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");

  useEffect(() => {
    const keyword = locationInput.trim();
    if (keyword.length < 2) {
      setLocationOptions([]);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLocationLoading(true);
        const language: LocationSuggestionLanguage =
          i18n.language === "en" ? "en" : "vi";
        const results = await workerServicesApi.getLocationSuggestions(
          keyword,
          language,
          10
        );
        if (isCancelled) return;
        setLocationFetchFailed(false);
        setLocationOptions(
          results.map((item) => ({
            value: item.name,
            label: item.name,
            coords: `${item.lat},${item.lng}`,
          }))
        );
      } catch {
        if (isCancelled) return;
        setLocationFetchFailed(true);
        setLocationOptions([]);
      } finally {
        if (!isCancelled) {
          setIsLocationLoading(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [i18n.language, locationInput]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedQuery = query.trim();
      const trimmedLocationInput = locationInput.trim();

      if (trimmedLocationInput && !selectedLocationCoords) {
        if (locationFetchFailed) {
          message.info(
            t("home.hero.locationFallback", {
              defaultValue:
                "Hiện chưa tải được gợi ý địa điểm, hệ thống sẽ tìm kiếm không kèm vị trí.",
            })
          );
        } else {
          message.warning(
            t("home.hero.locationRequireSelect", {
              defaultValue: "Vui lòng chọn một địa điểm từ danh sách gợi ý.",
            })
          );
          return;
        }
      }

      const params = new URLSearchParams();
      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }
      if (selectedLocationCoords) {
        params.set("location", selectedLocationCoords);
      }
      if (scheduleValue) {
        params.set("schedule", scheduleValue.toISOString());
      }
      if (activeCategory !== "ALL") {
        params.set("category", activeCategory);
      }

      const queryString = params.toString();
      router.push(queryString ? `/services?${queryString}` : "/services");
    },
    [
      activeCategory,
      locationFetchFailed,
      locationInput,
      query,
      router,
      scheduleValue,
      selectedLocationCoords,
      t,
    ]
  );

  const handleCategoryClick = useCallback(
    (categoryCode: string) => {
      setActiveCategory(categoryCode);
      if (categoryCode === "ALL") {
        router.push("/services");
        return;
      }
      router.push(`/services?category=${categoryCode}`);
    },
    [router]
  );

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            {t("home.hero.eyebrow", { defaultValue: "Marketplace dịch vụ" })}
          </span>
          <h1 className={styles.headline}>
            {t("home.hero.headline", {
              defaultValue: "Tìm người đồng hành cho mọi khoảnh khắc",
            })}
          </h1>
          <p className={styles.lede}>
            {t("home.hero.lede", {
              defaultValue:
                "Trợ lý cá nhân, hướng dẫn viên, người đồng hành — được tuyển chọn và xác minh.",
            })}
          </p>

          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <div className={styles.searchField}>
              <label className={styles.fieldLabel}>
                {t("home.hero.searchServiceLabel", {
                  defaultValue: "Bạn cần dịch vụ gì hôm nay?",
                })}
              </label>
              <Input
                size="large"
                bordered={false}
                placeholder={t("home.hero.searchPlaceholder", {
                  defaultValue: "Dịch vụ hỗ trợ",
                })}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchControl}
              />
            </div>
            <div className={styles.searchDivider} />
            <div className={styles.searchField}>
              <label className={styles.fieldLabel}>
                {t("home.hero.searchLocationLabel", { defaultValue: "Địa điểm" })}
              </label>
              <AutoComplete
                value={locationInput}
                options={locationOptions}
                onChange={(value) => setLocationInput(value)}
                onSearch={(value) => {
                  setLocationInput(value);
                  setSelectedLocationCoords("");
                }}
                onSelect={(value, option) => {
                  setLocationInput(value);
                  setSelectedLocationCoords(
                    (option as LocationAutoCompleteOption).coords
                  );
                }}
                placeholder={t("home.hero.searchLocationPlaceholder", {
                  defaultValue: "Quận 1, TP.HCM",
                })}
                className={styles.searchControl}
                notFoundContent={
                  locationInput.trim().length < 2
                    ? null
                    : t("common.noData", { defaultValue: "Không có dữ liệu" })
                }
              />
            </div>
            <div className={styles.searchDivider} />
            <div className={styles.searchField}>
              <label className={styles.fieldLabel}>
                {t("home.hero.searchTimeLabel", { defaultValue: "Thời gian" })}
              </label>
              <DatePicker
                showTime
                allowClear
                value={scheduleValue}
                onChange={(value) => setScheduleValue(value)}
                placeholder={t("home.hero.searchSchedulePlaceholder", {
                  defaultValue: "Chọn ngày và giờ",
                })}
                className={styles.searchControl}
                format="DD/MM/YYYY HH:mm"
              />
            </div>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={isLocationLoading}
              icon={<SearchOutlined />}
              className={styles.searchSubmit}
            >
              {t("home.hero.searchSubmit", { defaultValue: "Tìm kiếm" })}
            </Button>
          </form>
        </div>
      </div>
      <div className={styles.chipsWrap}>
        <div className={styles.chipsScroller}>
          {HERO_CATEGORIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleCategoryClick(item.key)}
              className={`${styles.chip} ${
                activeCategory === item.key ? styles.chipActive : ""
              }`}
            >
              <span className={styles.chipIcon}>{item.icon}</span>
              <span>
                {t(item.labelKey, {
                  defaultValue: item.defaultLabel,
                })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Hero = memo(HeroComponent);
