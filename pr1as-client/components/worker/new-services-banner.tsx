"use client"

import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { serviceService } from "@/services/service.service"
import { useMyWorkerServices } from "@/lib/hooks/use-worker-setup"

type NewServicesBannerProps = {
  onGoToServices?: () => void
}

export const NewServicesBanner = ({
  onGoToServices,
}: NewServicesBannerProps) => {
  const { data: allServices } = useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => serviceService.getServices(),
  })
  const { data: myServices } = useMyWorkerServices()

  const offeredCodes = new Set(
    (myServices ?? []).map((item) => item.service_code)
  )
  const missing = (allServices ?? []).filter(
    (service) => service.is_active && !offeredCodes.has(service.code)
  )

  if (missing.length === 0) {
    return null
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">
        Có {missing.length} dịch vụ mới bạn chưa cung cấp. Thêm vào hồ sơ để
        nhận đặt lịch.
      </p>
      <Button size="sm" onClick={onGoToServices}>
        Thêm dịch vụ
      </Button>
    </div>
  )
}
