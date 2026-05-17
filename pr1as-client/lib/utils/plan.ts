export function getPlanRingClass(planCode?: string | null): string {
  const normalized = (planCode?.trim() || "standard").toLowerCase()
  if (normalized.includes("diamond"))
    return "ring-2 ring-offset-2 ring-violet-500 ring-offset-background"
  if (normalized.includes("gold"))
    return "ring-2 ring-offset-2 ring-yellow-400 ring-offset-background"
  return "ring-2 ring-offset-2 ring-border ring-offset-background"
}
