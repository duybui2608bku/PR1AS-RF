"use client";

import { CategorySection } from "./components/category-section";
import { Hero } from "./components/hero";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  workerServicesApi,
  workerServiceSearchParamsToQueryString,
} from "@/lib/api/worker.api";
import { transformWorkersGroupedByServiceToServices } from "@/lib/utils/service-transform.utils";
import {
  homeListingFiltersFromUrl,
  homeListingFiltersToApiParams,
  type HomeListingFilters,
} from "@/lib/utils/home-listing-filters";
import { Suspense, useEffect, useMemo, useCallback } from "react";
import { SERVICE_CATEGORIES } from "./constants/constants";
import { useAuthStore } from "@/lib/stores/auth.store";
import { AppRoute } from "@/lib/constants/routes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Empty, Spin } from "antd";
import styles from "./page.module.scss";

/** Query marker for header tab «Khám phá» (/); ignored when hydrating filters. */
const HOME_EXPLORE_TAB = "explore";

function HomeExploreContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() ?? AppRoute.HOME;
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const querySignature = searchParams.toString();

  const listingFilters = useMemo(
    () => homeListingFiltersFromUrl(searchParams),
    [searchParams]
  );

  const syncExploreUrl = useCallback(
    (next: HomeListingFilters) => {
      const apiParams = homeListingFiltersToApiParams(next);
      const baseQs = workerServiceSearchParamsToQueryString(apiParams);
      if (!baseQs) {
        router.replace(pathname, { scroll: false });
        return;
      }
      const sp = new URLSearchParams(baseQs);
      sp.set("tab", HOME_EXPLORE_TAB);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!user || user.last_active_role !== "worker") {
      return;
    }

    if (!user.worker_profile) {
      router.replace(AppRoute.WORKER_SETUP);
      return;
    }

    router.replace(AppRoute.WORKER_BOOKINGS_SCHEDULE);
  }, [router, user]);

  useEffect(() => {
    const apiParams = homeListingFiltersToApiParams(listingFilters);
    const baseQs = workerServiceSearchParamsToQueryString(apiParams);
    if (!baseQs) return;
    if (searchParams.get("tab") === HOME_EXPLORE_TAB) return;
    const sp = new URLSearchParams(baseQs);
    sp.set("tab", HOME_EXPLORE_TAB);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [listingFilters, pathname, router, searchParams]);

  const listingApiParams = useMemo(
    () => homeListingFiltersToApiParams(listingFilters),
    [listingFilters]
  );

  const handleListingFiltersChange = useCallback(
    (
      patchOrUpdater:
        | Partial<HomeListingFilters>
        | ((prev: HomeListingFilters) => HomeListingFilters)
    ) => {
      const prev = homeListingFiltersFromUrl(searchParams);
      const next =
        typeof patchOrUpdater === "function"
          ? patchOrUpdater(prev)
          : { ...prev, ...patchOrUpdater };
      syncExploreUrl(next);
    },
    [searchParams, syncExploreUrl]
  );

  const { data: workersGroupedByService, isLoading } = useQuery({
    queryKey: ["workers-grouped-by-service", "home", querySignature],
    queryFn: () =>
      workerServicesApi.getWorkersGroupedByService(listingApiParams),
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
    () =>
      allServices.filter((s) => s.category === SERVICE_CATEGORIES.ASSISTANCE),
    [allServices]
  );

  const companionshipServices = useMemo(
    () =>
      allServices.filter(
        (s) => s.category === SERVICE_CATEGORIES.COMPANIONSHIP
      ),
    [allServices]
  );

  const personalAssistantServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.PERSONAL_ASSISTANT
      ),
    [assistanceServices]
  );

  const onSiteServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) =>
          s.categoryCode === SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST
      ),
    [assistanceServices]
  );

  const virtualAssistantServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.VIRTUAL_ASSISTANT
      ),
    [assistanceServices]
  );

  const tourGuideServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.TOUR_GUIDE
      ),
    [assistanceServices]
  );

  const translatorServices = useMemo(
    () =>
      assistanceServices.filter(
        (s) => s.categoryCode === SERVICE_CATEGORIES.TRANSLATOR
      ),
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

  const servicesListingEmpty = !isLoading && allServices.length === 0;

  if (user?.last_active_role === "worker") {
    return null;
  }

  return (
    <div className={styles.page}>
      <Hero
        listingFilters={listingFilters}
        onListingFiltersChange={handleListingFiltersChange}
      />

      <section id="services" className={styles.section}>
        {servicesListingEmpty ? (
          <div className={styles.servicesEmpty}>
            <Empty
              description={t("home.emptyListing", {
                defaultValue: "Không tìm thấy kết quả",
              })}
            />
          </div>
        ) : (
          <>
            <CategorySection
              eyebrow={t("home.eyebrow.featured", { defaultValue: "Featured" })}
              title={t("home.categories.assistance.title")}
              subtitle={t("home.categories.assistance.subtitle")}
              services={assistanceServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.ASSISTANCE}
            />

            <CategorySection
              title={t("home.categories.personalAssistant.title")}
              services={personalAssistantServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.PERSONAL_ASSISTANT}
            />

            <CategorySection
              title={t("home.categories.onSiteProfessional.title")}
              services={onSiteServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST}
            />

            <CategorySection
              title={t("home.categories.virtualAssistant.title")}
              services={virtualAssistantServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.VIRTUAL_ASSISTANT}
            />

            <CategorySection
              title={t("home.categories.tourGuide.title")}
              services={tourGuideServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.TOUR_GUIDE}
            />

            <CategorySection
              title={t("home.categories.translator.title")}
              services={translatorServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.TRANSLATOR}
            />

            <CategorySection
              eyebrow={t("home.eyebrow.companionship", {
                defaultValue: "Companionship",
              })}
              title={t("home.categories.companionship.title")}
              subtitle={t("home.categories.companionship.subtitle")}
              services={companionshipServices}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.COMPANIONSHIP}
            />

            <CategorySection
              title={t("home.categories.companionshipLevel1.title")}
              services={companionshipLevel1Services}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1}
            />

            <CategorySection
              title={t("home.categories.companionshipLevel2.title")}
              services={companionshipLevel2Services}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2}
            />

            <CategorySection
              title={t("home.categories.companionshipLevel3.title")}
              services={companionshipLevel3Services}
              isLoading={isLoading}
              categoryCode={SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_3}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin size="large" />
          </div>
        </div>
      }
    >
      <HomeExploreContent />
    </Suspense>
  );
}
