import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

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

export const metadata = createPageMetadata({
  title: "Tìm dịch vụ và worker",
  description:
    "Tìm kiếm worker phù hợp, lọc theo dịch vụ và khu vực, xem hồ sơ và đặt lịch trực tuyến trên PR1AS.",
  path: "/services",
})

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
