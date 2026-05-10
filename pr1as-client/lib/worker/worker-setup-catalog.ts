import type { ServiceItem } from "@/services/service.service"

export const WORKER_SETUP_ASSISTANCE_CODES = [
  "ON_SITE_PROFESSIONAL_ASSIST",
  "VIRTUAL_ASSISTANT",
  "TOUR_GUIDE",
  "TRANSLATOR",
] as const

const ASSISTANCE_CODE_ORDER = [...WORKER_SETUP_ASSISTANCE_CODES]

const ALLOWED_ASSISTANCE = new Set<string>(
  WORKER_SETUP_ASSISTANCE_CODES.map((c) => c),
)

export function sortAssistanceServices(services: ServiceItem[]): ServiceItem[] {
  const rank = new Map<string, number>(
    ASSISTANCE_CODE_ORDER.map((code, index) => [code, index]),
  )
  return [...services].sort((a, b) => {
    const ra = rank.get(String(a.code).toUpperCase()) ?? 999
    const rb = rank.get(String(b.code).toUpperCase()) ?? 999
    return ra - rb
  })
}

export function filterAssistanceServicesForWorkerSetup(
  services: ServiceItem[],
): ServiceItem[] {
  const filtered = services.filter((s) =>
    ALLOWED_ASSISTANCE.has(String(s.code).toUpperCase()),
  )
  return sortAssistanceServices(filtered)
}

export function isServiceIncludedInWorkerSetupStep(service: ServiceItem): boolean {
  if (service.category !== "ASSISTANCE") {
    return true
  }
  return ALLOWED_ASSISTANCE.has(String(service.code).toUpperCase())
}

function pickOneServicePerCompanionshipLevel(withLevel: ServiceItem[]): ServiceItem[] {
  const byLevel = new Map<number, ServiceItem[]>()
  for (const s of withLevel) {
    const lvl = s.companionship_level
    if (lvl == null) {
      continue
    }
    const list = byLevel.get(lvl) ?? []
    list.push(s)
    byLevel.set(lvl, list)
  }

  const chosen: ServiceItem[] = []
  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b)

  for (const lvl of sortedLevels) {
    const candidates = byLevel.get(lvl)
    if (!candidates?.length) {
      continue
    }
    const wantCode = `COMPANIONSHIP_LEVEL_${lvl}`
    const preferred = candidates.find(
      (c) => String(c.code).toUpperCase() === wantCode,
    )
    chosen.push(preferred ?? candidates[0])
  }

  return chosen
}

export function splitCompanionshipServices(services: ServiceItem[]): {
  base: ServiceItem | undefined
  levels: ServiceItem[]
} {
  const base =
    services.find(
      (s) =>
        String(s.code).toUpperCase() === "COMPANIONSHIP" &&
        s.companionship_level == null,
    ) ??
    services.find(
      (s) => s.category === "COMPANIONSHIP" && s.companionship_level == null,
    )

  const withLevel = services.filter(
    (s) => s.companionship_level != null && (!base || s.id !== base.id),
  )
  const levels = pickOneServicePerCompanionshipLevel(withLevel)

  return { base, levels }
}
