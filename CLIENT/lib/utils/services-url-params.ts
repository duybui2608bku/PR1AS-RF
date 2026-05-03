import type { WorkerServiceSearchParams } from "@/lib/api/worker.api";

export type UrlSearchParamsLike = Pick<
  URLSearchParams,
  "get" | "getAll"
>;

export function workerSearchParamsFromUrl(
  sp: UrlSearchParamsLike
): WorkerServiceSearchParams {
  const q = sp.getAll("q").map((s: string) => s.trim()).filter(Boolean);
  const category = sp
    .getAll("category")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const work_area = sp
    .getAll("work_area")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const schedule = sp
    .getAll("schedule")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const schedule_from = sp.get("schedule_from")?.trim();
  const schedule_to = sp.get("schedule_to")?.trim();
  const location = sp.get("location")?.trim();
  const provinceRaw = sp.get("province_code");
  const wardRaw = sp.get("ward_code");
  const province_code = provinceRaw ? Number(provinceRaw) : undefined;
  const ward_code = wardRaw ? Number(wardRaw) : undefined;

  const params: WorkerServiceSearchParams = {};
  if (q.length) params.q = q;
  if (category.length) params.category = category;
  if (work_area.length) params.work_area = work_area;
  if (schedule.length) params.schedule = schedule;
  if (schedule_from) params.schedule_from = schedule_from;
  if (schedule_to) params.schedule_to = schedule_to;
  if (location) params.location = location;
  if (province_code !== undefined && !Number.isNaN(province_code)) {
    params.province_code = province_code;
  }
  if (ward_code !== undefined && !Number.isNaN(ward_code)) {
    params.ward_code = ward_code;
  }
  return params;
}

export function hasWorkerSearchFilters(
  params: WorkerServiceSearchParams
): boolean {
  return Boolean(
    params.q?.length ||
      params.category?.length ||
      params.work_area?.length ||
      params.schedule?.length ||
      (Boolean(params.schedule_from?.trim()) &&
        Boolean(params.schedule_to?.trim())) ||
      params.location ||
      params.province_code != null ||
      params.ward_code != null
  );
}
