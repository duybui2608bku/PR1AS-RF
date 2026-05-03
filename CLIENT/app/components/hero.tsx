"use client";

import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  message,
  Spin,
  Tag,
} from "antd";
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
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SERVICE_CATEGORIES } from "@/app/constants/constants";
import {
  hydrateWorkAreaDisplayLabels,
  searchHeroWorkArea,
  type HeroWorkAreaOption,
} from "@/lib/vn-provinces/work-locations-api";
import type {
  HomeListingFilters,
  HomeWorkArea,
} from "@/lib/utils/home-listing-filters";
import styles from "./hero.module.scss";

const MAX_QUERY_TAGS = 12;
const MAX_WORK_AREAS = 10;

const { RangePicker } = DatePicker;

function workAreaKey(w: HomeWorkArea): string {
  return `${w.province_code}:${w.ward_code ?? ""}`;
}

interface HeroCategoryChip {
  key: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ReactNode;
}

interface HeroProps {
  listingFilters: HomeListingFilters;
  onListingFiltersChange: (
    updater:
      | Partial<HomeListingFilters>
      | ((prev: HomeListingFilters) => HomeListingFilters)
  ) => void;
}

interface ChipButtonProps {
  item: HeroCategoryChip;
  isActive: boolean;
  onClick: (key: string) => void;
  t: (key: string, options?: Record<string, string>) => string;
}

const ChipButton = memo(({ item, isActive, onClick, t }: ChipButtonProps) => (
  <button
    type="button"
    onClick={() => onClick(item.key)}
    className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
  >
    <span className={styles.chipIcon}>{item.icon}</span>
    <span>{t(item.labelKey, { defaultValue: item.defaultLabel })}</span>
  </button>
));
ChipButton.displayName = "ChipButton";

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

const HeroComponent = ({
  listingFilters,
  onListingFiltersChange,
}: HeroProps) => {
  const { t } = useTranslation();
  const [areaInput, setAreaInput] = useState("");
  const [areaOptions, setAreaOptions] = useState<HeroWorkAreaOption[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const areaSelectedLabelRef = useRef<string | null>(null);
  const [queryDraft, setQueryDraft] = useState("");
  const [resolvedWorkAreaLabels, setResolvedWorkAreaLabels] = useState<
    Record<string, string>
  >({});

  const workAreasSig = useMemo(
    () => listingFilters.workAreas.map(workAreaKey).join("\u001f"),
    [listingFilters.workAreas]
  );

  useEffect(() => {
    const areas = listingFilters.workAreas;
    const activeKeys = new Set(areas.map(workAreaKey));

    setResolvedWorkAreaLabels((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (activeKeys.has(k)) next[k] = v;
      }
      return next;
    });

    const needsResolve = areas.filter((w) => !w.label?.trim());
    if (!needsResolve.length) return;

    let cancelled = false;
    void (async () => {
      try {
        const hydrated = await hydrateWorkAreaDisplayLabels(needsResolve);
        if (cancelled) return;
        setResolvedWorkAreaLabels((prev) => {
          const next = { ...prev };
          needsResolve.forEach((w, i) => {
            const lab = hydrated[i]?.label?.trim();
            if (lab) next[workAreaKey(w)] = lab;
          });
          return next;
        });
      } catch {
        /* keep code fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `workAreasSig` mirrors listingFilters.workAreas entries
  }, [workAreasSig]);

  const workAreaTagLabel = useCallback(
    (w: HomeWorkArea) =>
      w.label?.trim() ||
      resolvedWorkAreaLabels[workAreaKey(w)] ||
      (w.ward_code !== undefined
        ? `${w.province_code}:${w.ward_code}`
        : `${w.province_code}`),
    [resolvedWorkAreaLabels]
  );

  useEffect(() => {
    const keyword = areaInput.trim();
    if (keyword.length < 2) {
      setAreaOptions([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setAreaLoading(true);
        const results = await searchHeroWorkArea(keyword);
        if (cancelled) return;
        setAreaOptions(results);
      } catch {
        if (!cancelled) setAreaOptions([]);
      } finally {
        if (!cancelled) setAreaLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [areaInput]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedArea = areaInput.trim();
      if (trimmedArea.length >= 2) {
        message.warning(
          t("home.hero.selectWorkAreaFromList", {
            defaultValue:
              "Vui lòng chọn tỉnh/thành hoặc phường/xã từ danh sách gợi ý.",
          })
        );
        return;
      }

      requestAnimationFrame(() => {
        document.getElementById("services")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [areaInput, t]
  );

  const handleAreaChange = useCallback((value: string) => {
    setAreaInput(value);
    if (areaSelectedLabelRef.current !== value) {
      areaSelectedLabelRef.current = null;
    }
  }, []);

  const handleAreaSelect = useCallback(
    (value: string, option: unknown) => {
      const o = option as HeroWorkAreaOption;
      areaSelectedLabelRef.current = value;
      setAreaInput("");
      const entry: HomeWorkArea =
        o.kind === "ward" && o.ward_code !== undefined
          ? {
              province_code: o.province_code,
              ward_code: o.ward_code,
              label: o.label,
            }
          : { province_code: o.province_code, label: o.label };

      onListingFiltersChange((prev) => {
        const k = workAreaKey(entry);
        if (prev.workAreas.some((w) => workAreaKey(w) === k)) {
          return prev;
        }
        if (prev.workAreas.length >= MAX_WORK_AREAS) {
          message.warning(
            t("home.hero.workAreasLimit", {
              defaultValue: `Tối đa ${MAX_WORK_AREAS} khu vực.`,
            })
          );
          return prev;
        }
        return { ...prev, workAreas: [...prev.workAreas, entry] };
      });
    },
    [onListingFiltersChange, t]
  );

  const removeWorkArea = useCallback(
    (key: string) => {
      onListingFiltersChange((prev) => ({
        ...prev,
        workAreas: prev.workAreas.filter((w) => workAreaKey(w) !== key),
      }));
    },
    [onListingFiltersChange]
  );

  const commitKeywordDraft = useCallback(
    (raw: string) => {
      const segments = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!segments.length) {
        setQueryDraft("");
        return;
      }
      onListingFiltersChange((prev) => {
        const next = [...prev.queries];
        let warned = false;
        for (const seg of segments) {
          if (next.includes(seg)) continue;
          if (next.length >= MAX_QUERY_TAGS) {
            if (!warned) {
              warned = true;
              message.warning(
                t("home.hero.queriesLimit", {
                  defaultValue: `Tối đa ${MAX_QUERY_TAGS} từ khóa.`,
                })
              );
            }
            break;
          }
          next.push(seg);
        }
        return { ...prev, queries: next };
      });
      setQueryDraft("");
    },
    [onListingFiltersChange, t]
  );

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitKeywordDraft(queryDraft);
        return;
      }
      if (e.key === ",") {
        e.preventDefault();
        commitKeywordDraft(queryDraft);
      }
    },
    [commitKeywordDraft, queryDraft]
  );

  const handleKeywordBlur = useCallback(() => {
    if (queryDraft.trim()) {
      commitKeywordDraft(queryDraft);
    }
  }, [commitKeywordDraft, queryDraft]);

  const removeQuery = useCallback(
    (token: string) => {
      onListingFiltersChange((prev) => ({
        ...prev,
        queries: prev.queries.filter((x) => x !== token),
      }));
    },
    [onListingFiltersChange]
  );

  const areaNotFound = useMemo(
    () =>
      areaInput.trim().length < 2
        ? null
        : t("common.noData", { defaultValue: "Không có dữ liệu" }),
    [areaInput, t]
  );

  const handleCategoryClick = useCallback(
    (categoryCode: string) => {
      if (categoryCode === "ALL") {
        onListingFiltersChange({ categories: [] });
        return;
      }
      onListingFiltersChange((prev) => {
        const set = new Set(prev.categories);
        if (set.has(categoryCode)) set.delete(categoryCode);
        else set.add(categoryCode);
        return { ...prev, categories: Array.from(set) };
      });
    },
    [onListingFiltersChange]
  );

  const chipIsActive = useCallback(
    (key: string) => {
      if (key === "ALL") return listingFilters.categories.length === 0;
      return listingFilters.categories.includes(key);
    },
    [listingFilters.categories]
  );

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.copy}>
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
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                onBlur={handleKeywordBlur}
                placeholder={t("home.hero.searchPlaceholder", {
                  defaultValue: "Thêm từ khóa (Enter hoặc dấu phẩy)",
                })}
                className={`${styles.searchControl} ${styles.heroKeywordShell}`}
              />
              {listingFilters.queries.length > 0 ? (
                <div className={styles.tagRow}>
                  {listingFilters.queries.map((qToken) => (
                    <Tag
                      key={qToken}
                      closable
                      onClose={() => removeQuery(qToken)}
                    >
                      {qToken}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.searchDivider} />
            <div className={`${styles.searchField} ${styles.locationField}`}>
              <label className={styles.fieldLabel}>
                {t("home.hero.searchLocationLabel", {
                  defaultValue: "Khu vực làm việc",
                })}
              </label>
              <AutoComplete
                value={areaInput}
                options={areaOptions}
                filterOption={false}
                onChange={handleAreaChange}
                onSelect={handleAreaSelect}
                placeholder={t("home.hero.workAreaPlaceholder", {
                  defaultValue: "Tìm tỉnh/thành hoặc phường/xã",
                })}
                className={`${styles.searchControl} ${styles.heroAreaComplete}`}
                notFoundContent={
                  areaLoading ? <Spin size="small" /> : areaNotFound
                }
              />
              {listingFilters.workAreas.length > 0 ? (
                <div className={styles.tagRow}>
                  {listingFilters.workAreas.map((w) => (
                    <Tag
                      key={workAreaKey(w)}
                      closable
                      onClose={() => removeWorkArea(workAreaKey(w))}
                    >
                      {workAreaTagLabel(w)}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.searchDivider} />
            <div className={styles.searchField}>
              <label className={styles.fieldLabel}>
                {t("home.hero.searchTimeLabel", { defaultValue: "Thời gian" })}
              </label>
              <RangePicker
                showTime
                allowClear
                format="DD/MM/YYYY HH:mm"
                className={`${styles.searchControl} ${styles.heroScheduleRange}`}
                placeholder={[
                  t("home.hero.scheduleFromPlaceholder", {
                    defaultValue: "Từ ngày/giờ",
                  }),
                  t("home.hero.scheduleToPlaceholder", {
                    defaultValue: "Đến ngày/giờ",
                  }),
                ]}
                value={
                  listingFilters.scheduleRange
                    ? [
                        dayjs(listingFilters.scheduleRange.from),
                        dayjs(listingFilters.scheduleRange.to),
                      ]
                    : null
                }
                onChange={(vals) => {
                  if (!vals?.[0] || !vals[1]) {
                    onListingFiltersChange({ scheduleRange: null });
                    return;
                  }
                  if (vals[1].isBefore(vals[0])) {
                    message.warning(
                      t("home.hero.scheduleRangeOrder", {
                        defaultValue:
                          "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
                      })
                    );
                    return;
                  }
                  onListingFiltersChange({
                    scheduleRange: {
                      from: vals[0].toISOString(),
                      to: vals[1].toISOString(),
                    },
                  });
                }}
              />
            </div>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={areaLoading}
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
            <ChipButton
              key={item.key}
              item={item}
              isActive={chipIsActive(item.key)}
              onClick={handleCategoryClick}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export const Hero = memo(HeroComponent);
