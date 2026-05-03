"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useCallback, Suspense, useEffect } from "react";
import { Button, Empty, Spin, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { workerServicesApi } from "@/lib/api/worker.api";
import { transformSearchResultsToServices } from "@/lib/utils/service-transform.utils";
import {
  hasWorkerSearchFilters,
  workerSearchParamsFromUrl,
} from "@/lib/utils/services-url-params";
import { ServiceCard } from "@/app/components/service-card";
import { ServiceCardSkeleton } from "@/lib/components/skeletons";
import { buildWorkerProfileRoute } from "@/lib/constants/routes";
import { ServiceListing } from "@/lib/types/service-listing";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import {
  CATEGORY_TRANSLATION_MAP,
  PARENT_CATEGORIES,
  ServicesPageConfig,
} from "./constants/services-page.constants";
import styles from "./page.module.scss";

const { Title, Paragraph } = Typography;

function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { handleError } = useErrorHandler();

  const apiParams = useMemo(
    () => workerSearchParamsFromUrl(searchParams),
    [searchParams]
  );

  const categoryCodes = useMemo(
    () =>
      searchParams
        .getAll("category")
        .map((c) => c.trim())
        .filter(Boolean),
    [searchParams]
  );

  const hasFilters = useMemo(
    () => hasWorkerSearchFilters(apiParams),
    [apiParams]
  );

  const {
    data: serviceResults,
    isLoading,
    error: workersGroupedByServiceError,
  } = useQuery({
    queryKey: ["workers-grouped-by-service", "services", apiParams],
    queryFn: () => {
      if (!hasFilters) {
        return workerServicesApi.getWorkersGroupedByService();
      }
      return workerServicesApi.searchServices(apiParams);
    },
  });

  useEffect(() => {
    if (workersGroupedByServiceError) {
      handleError(workersGroupedByServiceError);
    }
  }, [workersGroupedByServiceError, handleError]);

  const allServices = useMemo(() => {
    if (!serviceResults) return [];
    const locale = i18n.language;
    return transformSearchResultsToServices(serviceResults, locale);
  }, [serviceResults, i18n.language]);

  const filteredServices = useMemo(() => {
    if (categoryCodes.length === 0) return allServices;
    if (categoryCodes.length === 1) {
      const categoryCode = categoryCodes[0];
      const isParentCategory = PARENT_CATEGORIES.includes(categoryCode);

      if (isParentCategory) {
        return allServices.filter((s) => s.category === categoryCode);
      }

      return allServices.filter((s) => s.categoryCode === categoryCode);
    }
    return allServices;
  }, [allServices, categoryCodes]);

  const categoryTitle = useMemo(() => {
    if (categoryCodes.length === 0) {
      return t("home.viewAll");
    }
    if (categoryCodes.length === 1) {
      const translationKey = CATEGORY_TRANSLATION_MAP[categoryCodes[0]];
      return translationKey ? t(translationKey) : categoryCodes[0];
    }
    return t("home.searchResultsTitle", {
      defaultValue: "Kết quả tìm kiếm",
    });
  }, [categoryCodes, t]);

  const handleServiceClick = useCallback(
    (service: ServiceListing) => {
      if (!service.users || service.users.length === 0) {
        return;
      }
      const primaryUser =
        service.users[ServicesPageConfig.PRIMARY_WORKER_INDEX];
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
        <Title level={1} className={styles.title}>
          {categoryTitle}
        </Title>
        <Paragraph className={styles.subtitle}>
          {t("home.viewAll")} - {filteredServices.length} {t("common.search")}
        </Paragraph>
      </div>

      {isLoading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: ServicesPageConfig.SKELETON_COUNT }).map(
            (_, index) => (
              <div key={index} className={styles.cardWrapper}>
                <ServiceCardSkeleton size="medium" />
              </div>
            )
          )}
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
