import { SiteLayout } from "@/components/layout/site-layout"
import { WorkersByServiceList } from "@/components/worker/workers-by-service-list"
import { HomeHero } from "@/components/hero/home-hero"
import { serviceService } from "@/services/service.service"
import { workerService } from "@/services/worker.service"

export default async function HomePage() {
  const [servicesResult, workersResult] = await Promise.allSettled([
    serviceService.getServices(),
    workerService.getWorkersGroupedByService(),
  ])

  const services = servicesResult.status === "fulfilled" ? servicesResult.value : []
  const workers = workersResult.status === "fulfilled" ? workersResult.value : []
  const hasWorkersError = workersResult.status === "rejected"

  return (
    <SiteLayout>
      <HomeHero initialServices={services} />
      <WorkersByServiceList groupedServices={workers} hasFetchError={hasWorkersError} />
    </SiteLayout>
  )
}
