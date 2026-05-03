import type { WorkerServiceSearchParams } from "@/lib/api/worker.api";
import {
  workerSearchParamsFromUrl,
  type UrlSearchParamsLike,
} from "@/lib/utils/services-url-params";

export interface HomeWorkArea {
  province_code: number;
  ward_code?: number;
  /** Display label (optional; API uses codes only) */
  label?: string;
}

export interface HomeListingFilters {
  queries: string[];
  categories: string[];
  workAreas: HomeWorkArea[];
  /** ISO datetimes (UTC); both ends inclusive for API range filter */
  scheduleRange: { from: string; to: string } | null;
}

export const HOME_LISTING_INITIAL: HomeListingFilters = {
  queries: [],
  categories: [],
  workAreas: [],
  scheduleRange: null,
};

function parseWorkAreaSegment(seg: string): HomeWorkArea | null {
  const raw = seg.trim();
  if (!raw) return null;
  const parts = raw.split(":").map((x) => x.trim());
  if (parts.length === 1) {
    const n = Number(parts[0]);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return { province_code: n };
  }
  if (parts.length === 2) {
    const p = Number(parts[0]);
    const w = Number(parts[1]);
    if (!Number.isFinite(p) || !Number.isInteger(p)) return null;
    if (!Number.isFinite(w) || !Number.isInteger(w)) return null;
    return { province_code: p, ward_code: w };
  }
  return null;
}

/** Hydrate hero/home listing state from URL (shared shape with `/services`). */
export function homeListingFiltersFromUrl(
  sp: UrlSearchParamsLike
): HomeListingFilters {
  const p = workerSearchParamsFromUrl(sp);

  const queries = [...(p.q ?? [])];
  const categories = [...(p.category ?? [])];

  let workAreas: HomeWorkArea[] = [];
  if (p.work_area?.length) {
    const seen = new Set<string>();
    for (const wa of p.work_area) {
      const parsed = parseWorkAreaSegment(wa);
      if (!parsed) continue;
      const key =
        parsed.ward_code != null
          ? `${parsed.province_code}:${parsed.ward_code}`
          : `${parsed.province_code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      workAreas.push(parsed);
    }
  } else if (
    p.province_code != null &&
    !Number.isNaN(p.province_code)
  ) {
    const entry: HomeWorkArea = { province_code: p.province_code };
    if (p.ward_code != null && !Number.isNaN(p.ward_code)) {
      entry.ward_code = p.ward_code;
    }
    workAreas = [entry];
  }

  let scheduleRange: { from: string; to: string } | null = null;
  const sf = p.schedule_from?.trim();
  const st = p.schedule_to?.trim();
  if (sf && st) {
    scheduleRange = { from: sf, to: st };
  }

  return {
    queries,
    categories,
    workAreas,
    scheduleRange,
  };
}

export function homeListingFiltersToApiParams(
  f: HomeListingFilters
): WorkerServiceSearchParams | undefined {
  const q = f.queries.map((s) => s.trim()).filter(Boolean);
  const category = f.categories.filter(Boolean);
  const work_area = f.workAreas.map((wa) =>
    wa.ward_code != null && wa.ward_code !== undefined
      ? `${wa.province_code}:${wa.ward_code}`
      : `${wa.province_code}`
  );
  const rangeFrom = f.scheduleRange?.from?.trim();
  const rangeTo = f.scheduleRange?.to?.trim();
  const hasRange = Boolean(rangeFrom && rangeTo);

  const has =
    q.length > 0 ||
    category.length > 0 ||
    work_area.length > 0 ||
    hasRange;

  if (!has) return undefined;

  const params: WorkerServiceSearchParams = {};
  if (q.length) params.q = q;
  if (category.length) params.category = category;
  if (work_area.length) params.work_area = work_area;
  if (hasRange && rangeFrom && rangeTo) {
    params.schedule_from = rangeFrom;
    params.schedule_to = rangeTo;
  }
  return params;
}
