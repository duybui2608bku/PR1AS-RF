import { useMemo } from "react";
import { useApiQueryData } from "@/lib/hooks/use-api";
import type { Service } from "@/lib/types/worker";

type AllServicesResponse = {
  services: Service[];
  count: number;
};

type UseServicesMapResult = {
  serviceMap: Map<string, Service>;
  isLoading: boolean;
};

export function useServicesMap(): UseServicesMapResult {
  const { data: allServicesResponse, isLoading } =
    useApiQueryData<AllServicesResponse>(["all-services"], "/services", {
      enabled: true,
    });

  const serviceMap = useMemo(() => {
    const services = allServicesResponse?.services || [];
    if (!Array.isArray(services) || services.length === 0) {
      return new Map<string, Service>();
    }

    const map = new Map<string, Service>();
    services.forEach((service) => {
      map.set(service.code, service);
    });
    return map;
  }, [allServicesResponse]);

  return {
    serviceMap,
    isLoading,
  };
}
