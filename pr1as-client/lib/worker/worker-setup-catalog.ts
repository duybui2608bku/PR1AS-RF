import type { ServiceItem } from "@/services/service.service"

// v2 catalog: services are grouped into two top-level categories — VIRTUAL
// (trợ lý ảo) and PHYSICAL (trợ lý thực tế). Every active service in the
// catalog is selectable during worker setup.

export function isServiceIncludedInWorkerSetupStep(_service: ServiceItem): boolean {
  return true
}

const byName = (a: ServiceItem, b: ServiceItem): number =>
  String(a.code).localeCompare(String(b.code))

export function splitServicesByCategory(services: ServiceItem[]): {
  virtual: ServiceItem[]
  physical: ServiceItem[]
} {
  const virtual = services
    .filter((s) => s.category === "VIRTUAL")
    .sort(byName)
  const physical = services
    .filter((s) => s.category === "PHYSICAL")
    .sort(byName)
  return { virtual, physical }
}
