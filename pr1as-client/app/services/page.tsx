import { SiteLayout } from "@/components/layout/site-layout"
import { HomeRoleGate } from "@/components/layout/home-role-gate"
import { HomeSearchExperience } from "@/components/home/home-search-experience"
import {
  homeStateToFilters,
  parseHomeSearchParams,
  type HomeSearchParams,
} from "@/lib/home/home-search-params"
import { serviceService } from "@/services/service.service"
import { workerService } from "@/services/worker.service"

type ServicesPageProps = {
  searchParams: Promise<HomeSearchParams>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const rawParams = await searchParams
  const initialState = parseHomeSearchParams(rawParams)
  const initialFilters = homeStateToFilters(initialState)

  const [servicesResult, workersResult] = await Promise.allSettled([
    serviceService.getServices(),
    workerService.getWorkersGroupedByService(initialFilters),
  ])

  const services = servicesResult.status === "fulfilled" ? servicesResult.value : []
  const workers = workersResult.status === "fulfilled" ? workersResult.value : []
  const hasWorkersError = workersResult.status === "rejected"

  return (
    <SiteLayout>
      <HomeRoleGate>
        <HomeSearchExperience
          initialServices={services}
          initialWorkers={workers}
          hasWorkersError={hasWorkersError}
          initialState={initialState}
        />
      </HomeRoleGate>
    </SiteLayout>
  )
}
