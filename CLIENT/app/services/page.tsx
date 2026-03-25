"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useCallback, Suspense } from "react";
import { Button, Empty, Spin } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { workerServicesApi } from "@/lib/api/worker.api";
import { transformWorkersGroupedByServiceToServices } from "@/lib/utils/service-transform.utils";
import { SERVICE_CATEGORIES } from "@/app/constants/constants";
import { ServiceCard } from "@/app/components/service-card";
import { ServiceCardSkeleton } from "@/lib/components/skeletons";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import { ServiceListing } from "@/lib/types/service-listing";
import styles from "./page.module.scss";

const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
  [SERVICE_CATEGORIES.ASSISTANCE]: "home.categories.assistance.title",
  [SERVICE_CATEGORIES.PERSONAL_ASSISTANT]: "home.categories.personalAssistant.title",
  [SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST]: "home.categories.onSiteProfessional.title",
  [SERVICE_CATEGORIES.VIRTUAL_ASSISTANT]: "home.categories.virtualAssistant.title",
  [SERVICE_CATEGORIES.TOUR_GUIDE]: "home.categories.tourGuide.title",
  [SERVICE_CATEGORIES.TRANSLATOR]: "home.categories.translator.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP]: "home.categories.companionship.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1]: "home.categories.companionshipLevel1.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2]: "home.categories.companionshipLevel2.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_3]: "home.categories.companionshipLevel3.title",
};

const PARENT_CATEGORIES: string[] = [SERVICE_CATEGORIES.ASSISTANCE, SERVICE_CATEGORIES.COMPANIONSHIP];

enum SkeletonCount {
  DEFAULT = 8,
}

enum PrimaryWorkerIndex {
  FIRST = 0,
}

function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const categoryCode = searchParams.get("category") || "";

  const { data: workersGroupedByService, isLoading } = useQuery({
    queryKey: ["workers-grouped-by-service"],
    queryFn: () => workerServicesApi.getWorkersGroupedByService(),
  });

  const allServices = useMemo(() => {
    if (!workersGroupedByService) return [];
    const locale = i18n.language;
    return transformWorkersGroupedByServiceToServices(
      workersGroupedByService,
      locale
    );
  }, [workersGroupedByService, i18n.language]);

  const filteredServices = useMemo(() => {
    if (!categoryCode) return allServices;

    const isParentCategory = PARENT_CATEGORIES.includes(categoryCode);

    if (isParentCategory) {
      return allServices.filter((s) => s.category === categoryCode);
    }

    return allServices.filter((s) => s.categoryCode === categoryCode);
  }, [allServices, categoryCode]);

  const categoryTitle = useMemo(() => {
    const translationKey = CATEGORY_TRANSLATION_MAP[categoryCode];
    return translationKey ? t(translationKey) : categoryCode;
  }, [categoryCode, t]);

  const handleServiceClick = useCallback(
    (service: ServiceListing) => {
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

  return (
    <div className={styles.container}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/")}
        className={styles.backButton}
      >
        {t("common.back")}
      </Button>

      <div className={styles.header}>
        <h1 className={styles.title}>{categoryTitle}</h1>
        <p className={styles.subtitle}>
          {t("home.viewAll")} - {filteredServices.length} {t("common.search")}
        </p>
      </div>

      {isLoading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: SkeletonCount.DEFAULT }).map((_, index) => (
            <div key={index} className={styles.cardWrapper}>
              <ServiceCardSkeleton size="medium" />
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description={t("errors.notFound.message")} />
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredServices.map((service) => (
            <div key={service.id} className={styles.cardWrapper}>
              <ServiceCard
                service={service}
                size="medium"
                onClick={() => handleServiceClick(service)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <Spin size="large" />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
