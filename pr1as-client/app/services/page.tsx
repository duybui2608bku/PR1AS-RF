import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { SiteLayout } from "@/components/layout/site-layout"
import { HomeRoleGate } from "@/components/layout/home-role-gate"
import { HomeSearchExperience } from "@/components/home/home-search-experience"
import {
  homeStateToFilters,
  parseHomeSearchParams,
  type HomeSearchParams,
} from "@/lib/home/home-search-params"
import { createPageMetadata } from "@/lib/seo"
import { getQueryClient } from "@/lib/query-client"
import { serviceService } from "@/services/service.service"
import { workerService } from "@/services/worker.service"

export const metadata = createPageMetadata({
  title: "Tìm dịch vụ và worker",
  description:
    "Tìm kiếm worker phù hợp, lọc theo dịch vụ và khu vực, xem hồ sơ và đặt lịch trực tuyến trên PR1AS.",
  path: "/services",
})

type ServicesPageProps = {
  searchParams: Promise<HomeSearchParams>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const rawParams = await searchParams
  const initialState = parseHomeSearchParams(rawParams)
  const initialFilters = homeStateToFilters(initialState)

  const queryClient = getQueryClient()

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["services", "list"],
      queryFn: serviceService.getServices,
    }),
    queryClient.prefetchQuery({
      queryKey: ["workers", "grouped-by-service", initialFilters],
      queryFn: () => workerService.getWorkersGroupedByService(initialFilters),
    }),
  ])

  return (
    <SiteLayout>
      <HomeRoleGate>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <HomeSearchExperience initialState={initialState} />
        </HydrationBoundary>
      </HomeRoleGate>
    </SiteLayout>
  )
}
