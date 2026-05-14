"use client"

import { use } from "react"
import { AlertCircle } from "lucide-react"

import { SiteLayout } from "@/components/layout/site-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkerDetail } from "@/lib/hooks/use-worker"
import { useAuthStore } from "@/lib/store/auth-store"
import { WorkerCalendar } from "@/components/worker/worker-calendar"
import { WorkerInfoCards } from "@/components/worker/worker-info-cards"
import { WorkerProfileHeader } from "@/components/worker/worker-profile-header"
import { WorkerReviews } from "@/components/worker/worker-reviews"
import { WorkerServices } from "@/components/worker/worker-services"
import { WorkerStatCards } from "@/components/worker/worker-stat-cards"
import { WorkerSuggestions } from "@/components/worker/worker-suggestions"

type PageParams = { id: string }

export default function WorkerProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = use(params)
  const { data, isLoading, error } = useWorkerDetail(id)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isOwnProfile = Boolean(currentUserId && currentUserId === id)

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {isLoading ? <WorkerProfileSkeleton /> : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Không thể tải thông tin worker</AlertTitle>
                <AlertDescription>
                  Vui lòng thử lại sau hoặc kiểm tra đường dẫn.
                </AlertDescription>
              </Alert>
            ) : null}

            {data ? (
              <div className="space-y-6">
                <WorkerProfileHeader worker={data} isOwnProfile={isOwnProfile} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px]">
                  <div className="space-y-4">
                    <WorkerStatCards profile={data.worker_profile} />
                    <WorkerInfoCards profile={data.worker_profile} />
                    <WorkerReviews reviews={data.reviews ?? []} />
                  </div>
                  <aside className="space-y-4">
                    <WorkerCalendar workerId={data.user.id} />
                    <WorkerServices
                      workerId={data.user.id}
                      workerName={data.user.full_name ?? "worker"}
                      services={data.services ?? []}
                      workerReputationScore={data.user.meta_data?.reputation_score}
                    />
                  </aside>
                </div>
              </div>
            ) : null}
          </div>
          <aside className="hidden xl:block">
            <WorkerSuggestions />
          </aside>
        </div>
      </div>
    </SiteLayout>
  )
}

function WorkerProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}
