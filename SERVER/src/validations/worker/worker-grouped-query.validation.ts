import { z } from "zod";

const locationRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** First scalar from Express query (string or repeated keys → array). */
function firstQueryScalar(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.length ? firstQueryScalar(value[0]) : undefined;
  }
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? undefined : t;
  }
  return String(value);
}

function toStringArray(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringArray(item));
  }
  const s = String(value).trim();
  return s ? [s] : [];
}

function parseWorkAreaSegment(raw: string): {
  province_code: number;
  ward_code?: number;
} | null {
  const t = raw.trim();
  if (!t) return null;
  const parts = t.split(":").map((x) => x.trim());
  if (parts.length === 1) {
    const p = Number(parts[0]);
    if (!Number.isFinite(p) || !Number.isInteger(p)) return null;
    return { province_code: p };
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

const scheduleStringSchema = z
  .string()
  .trim()
  .datetime({
    offset: true,
    message: "schedule must be a valid ISO-8601 datetime with timezone",
  })
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), {
    message: "schedule must be a valid datetime",
  });

/** Raw Express query preprocess → normalized shape for z.object */
function preprocessGroupedQuery(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const q = raw as Record<string, unknown>;

  const qs = toStringArray(q.q)
    .map((s) => s.trim())
    .filter(Boolean);
  const categories = toStringArray(q.category)
    .map((s) => s.trim())
    .filter(Boolean);
  const scheduleRaw = toStringArray(q.schedule);

  let workAreaStrs = toStringArray(q.work_area)
    .map((s) => s.trim())
    .filter(Boolean);

  if (workAreaStrs.length === 0) {
    const provinceRaw = q.province_code;
    let p: number | undefined;
    if (typeof provinceRaw === "number" && Number.isInteger(provinceRaw)) {
      p = provinceRaw;
    } else if (typeof provinceRaw === "string" && provinceRaw.trim() !== "") {
      const n = Number(provinceRaw.trim());
      if (Number.isFinite(n) && Number.isInteger(n)) p = n;
    }

    if (p !== undefined) {
      let w: number | undefined;
      const wardRaw = q.ward_code;
      if (typeof wardRaw === "number" && Number.isInteger(wardRaw)) {
        w = wardRaw;
      } else if (typeof wardRaw === "string" && wardRaw.trim() !== "") {
        const n = Number(wardRaw.trim());
        if (Number.isFinite(n) && Number.isInteger(n)) w = n;
      }
      workAreaStrs = w !== undefined ? [`${p}:${w}`] : [`${p}`];
    }
  }

  return {
    __qs: qs,
    __categories: categories,
    __scheduleStrs: scheduleRaw,
    __workAreaStrs: workAreaStrs,
    location: q.location,
    schedule_from: firstQueryScalar(q.schedule_from),
    schedule_to: firstQueryScalar(q.schedule_to),
  };
}

const normalizedGroupedQuerySchema = z
  .object({
    __qs: z.array(z.string().min(1)).default([]),
    __categories: z.array(z.string().min(1)).default([]),
    __scheduleStrs: z.array(scheduleStringSchema).default([]),
    __workAreaStrs: z
      .array(z.string().min(1))
      .default([])
      .superRefine((arr, ctx) => {
        arr.forEach((seg, index) => {
          if (!parseWorkAreaSegment(seg)) {
            ctx.addIssue({
              code: "custom",
              message:
                "work_area must be province_code or province_code:ward_code (integers)",
              path: [index],
            });
          }
        });
      }),
    location: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .regex(locationRegex, {
          message: "location must be in 'lat,lng' format",
        })
        .refine((value) => {
          const [latText, lngText] = value.split(",");
          const lat = Number(latText);
          const lng = Number(lngText);
          return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        }, "location latitude must be [-90, 90] and longitude must be [-180, 180]")
        .optional()
    ),
    schedule_from: z.preprocess(
      emptyToUndefined,
      scheduleStringSchema.optional()
    ),
    schedule_to: z.preprocess(emptyToUndefined, scheduleStringSchema.optional()),
  })
  .refine(
    (data) =>
      (data.schedule_from === undefined && data.schedule_to === undefined) ||
      (data.schedule_from !== undefined && data.schedule_to !== undefined),
    {
      message: "schedule_from and schedule_to must be provided together",
      path: ["schedule_to"],
    }
  )
  .refine(
    (data) =>
      data.schedule_from === undefined ||
      data.schedule_to === undefined ||
      data.schedule_from.getTime() <= data.schedule_to.getTime(),
    {
      message: "schedule_from must be before or equal to schedule_to",
      path: ["schedule_from"],
    }
  )
  .transform((data) => {
    const work_areas: { province_code: number; ward_code?: number }[] = [];
    const seen = new Set<string>();
    for (const seg of data.__workAreaStrs) {
      const parsed = parseWorkAreaSegment(seg);
      if (!parsed) continue;
      const key = `${parsed.province_code}:${parsed.ward_code ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      work_areas.push(parsed);
    }

    return {
      qs: [...new Set(data.__qs)],
      categories: [...new Set(data.__categories)],
      work_areas,
      schedules: data.__scheduleStrs,
      schedule_from: data.schedule_from,
      schedule_to: data.schedule_to,
      location: data.location,
    };
  });

export const workerGroupedByServiceQuerySchema = z.preprocess(
  preprocessGroupedQuery,
  normalizedGroupedQuerySchema
);

export type WorkerGroupedByServiceQuery = z.infer<
  typeof normalizedGroupedQuerySchema
>;
