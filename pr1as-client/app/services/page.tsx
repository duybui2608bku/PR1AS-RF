import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getTranslations } from "next-intl/server"

import { AnnouncementRenderer } from "@/components/announcement"
import { HomeSearchExperience } from "@/components/home/home-search-experience"
import { SiteLayout } from "@/components/layout/site-layout"
import {
  parseHomeSearchParams,
  type HomeSearchParams,
} from "@/lib/home/home-search-params"
import { getQueryClient } from "@/lib/query-client"
import { createPageMetadata } from "@/lib/seo"
import { serviceService } from "@/services/service.service"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("servicesTitle"),
    description: t("servicesDescription"),
    path: "/services",
  })
}

type ServicesPageProps = {
  searchParams: Promise<HomeSearchParams>
}

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const rawParams = await searchParams
  const initialState = parseHomeSearchParams(rawParams)

  const queryClient = getQueryClient()

  await queryClient.prefetchQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
  })

  return (
    <SiteLayout>
      <AnnouncementRenderer placement="home_client_popup" />
      <AnnouncementRenderer placement="home_client_banner" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeSearchExperience initialState={initialState} />
      </HydrationBoundary>
    </SiteLayout>
  )
}
