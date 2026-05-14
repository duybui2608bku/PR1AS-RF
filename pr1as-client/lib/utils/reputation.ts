export const DEFAULT_REPUTATION_SCORE = 100

export const getReputationScore = (score?: number | null): number =>
  score ?? DEFAULT_REPUTATION_SCORE

export const getReputationBadgeClass = (score: number): string => {
  if (score < 30) return "bg-red-100 text-red-700"
  if (score < 70) return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}
