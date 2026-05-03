import { z } from "zod";

export interface WorkLocationOption {
  value: string;
  label: string;
  province_code: number;
  ward_code: number;
}

const provinceRowSchema = z.object({
  name: z.string(),
  code: z.number(),
  division_type: z.string(),
  codename: z.string(),
  phone_code: z.number(),
  wards: z.array(z.unknown()).optional(),
});

const wardRowSchema = z.object({
  name: z.string(),
  code: z.number(),
  division_type: z.string(),
  codename: z.string(),
  province_code: z.number(),
});

const provincesResponseSchema = z.array(provinceRowSchema);
const wardsResponseSchema = z.array(wardRowSchema);

let provinceNameByCode: Map<number, string> | null = null;

async function getProvinceNameByCode(): Promise<Map<number, string>> {
  if (provinceNameByCode) {
    return provinceNameByCode;
  }
  const res = await fetch("/api/vn/provinces");
  if (!res.ok) {
    throw new Error("Provinces request failed");
  }
  const json: unknown = await res.json();
  const parsed = provincesResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid provinces response");
  }
  const m = new Map<number, string>();
  for (const p of parsed.data) {
    m.set(p.code, p.name);
  }
  provinceNameByCode = m;
  return m;
}

/**
 * Resets in-memory province cache (e.g. after tests or forced refresh).
 */
export function clearWorkLocationProvinceCache(): void {
  provinceNameByCode = null;
}

export interface ProvinceOption {
  value: number;
  label: string;
}

export async function fetchProvincesList(): Promise<ProvinceOption[]> {
  const res = await fetch("/api/vn/provinces");
  if (!res.ok) {
    throw new Error("Provinces request failed");
  }
  const json: unknown = await res.json();
  const parsed = provincesResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid provinces response");
  }
  return parsed.data
    .map((p) => ({ value: p.code, label: p.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

export type HeroWorkAreaKind = "province" | "ward";

export interface HeroWorkAreaOption {
  value: string;
  label: string;
  kind: HeroWorkAreaKind;
  province_code: number;
  ward_code?: number;
}

const HERO_MAX_PROVINCE_HITS = 8;
const HERO_MAX_WARD_HITS = 18;

function foldSearchKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Folded label without leading administrative prefix (for substring match in query). */
function provinceShortFolded(fullFolded: string): string {
  return fullFolded
    .replace(/^tinh\s+/u, "")
    .replace(/^thanh\s+pho\s+/u, "")
    .replace(/^tp\.?\s+/u, "")
    .trim();
}

function stripVietProvincePrefix(label: string): string {
  return label
    .replace(/^Tỉnh\s+/iu, "")
    .replace(/^Thành phố\s+/iu, "")
    .replace(/^TP\.\s*/iu, "")
    .trim();
}

/** Compact province slice for inline ward labels (drop administrative prefixes). */
function shortProvinceLabel(fullProvinceName: string): string {
  const s = stripVietProvincePrefix(fullProvinceName).trim();
  return s.length > 0 ? s : fullProvinceName.trim();
}

function compactWardRowLabel(wardName: string, provinceFullName: string): string {
  return `${wardName.trim()} · ${shortProvinceLabel(provinceFullName)}`;
}

/**
 * If the user typed a province/city name (e.g. "Hồ Chí Minh"), infer its code so ward
 * search uses `province` instead of national fuzzy matching (which yields unrelated wards).
 */
function resolveProvinceFilterFromQuery(
  query: string,
  provinces: ProvinceOption[]
): number {
  const qFold = foldSearchKey(query);
  if (!qFold.trim()) return 0;

  let bestCode = 0;
  let bestLen = 0;

  const consider = (code: number, matchedLen: number) => {
    if (matchedLen > bestLen) {
      bestLen = matchedLen;
      bestCode = code;
    }
  };

  const hcm = provinces.find((p) =>
    foldSearchKey(p.label).includes("ho chi minh")
  );
  const hn = provinces.find((p) => foldSearchKey(p.label).includes("ha noi"));

  if (hcm) {
    const foldedAliases = [
      "thanh pho ho chi minh",
      "tp ho chi minh",
      "ho chi minh",
      "tp hcm",
      "tphcm",
      "sai gon",
      "saigon",
    ];
    for (const a of foldedAliases) {
      if (qFold.includes(a)) consider(hcm.value, a.length);
    }
  }

  if (hn) {
    const foldedAliases = ["thanh pho ha noi", "tp ha noi", "ha noi"];
    for (const a of foldedAliases) {
      if (qFold.includes(a)) consider(hn.value, a.length);
    }
  }

  for (const p of provinces) {
    const full = foldSearchKey(p.label);
    const shorty = provinceShortFolded(full);
    if (full.length >= 6 && qFold.includes(full)) {
      consider(p.value, full.length);
    } else if (shorty.length >= 4 && qFold.includes(shorty)) {
      consider(p.value, shorty.length);
    }
  }

  return bestCode;
}

function narrowQueryForWardSearch(
  query: string,
  provinces: ProvinceOption[],
  provinceCode: number
): string {
  const p = provinces.find((x) => x.value === provinceCode);
  if (!p) return query.trim();

  const variants = Array.from(
    new Set(
      [p.label, stripVietProvincePrefix(p.label)].filter((s) => s.length >= 2)
    )
  ).sort((a, b) => b.length - a.length);

  let q = query;
  for (const chunk of variants) {
    const escaped = chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q = q.replace(new RegExp(escaped, "gi"), " ");
  }
  return q.replace(/\s+/g, " ").trim();
}

/**
 * Single-field hero search: matching provinces (client filter) + wards (API).
 */
async function fetchWardByCode(
  wardCode: number
): Promise<{ name: string; province_code: number; code: number } | null> {
  const res = await fetch(`/api/vn/wards/${wardCode}`);
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = wardRowSchema.safeParse(json);
  if (!parsed.success) return null;
  return {
    name: parsed.data.name,
    province_code: parsed.data.province_code,
    code: parsed.data.code,
  };
}

/**
 * Resolve human-readable labels for areas hydrated from URL (codes only).
 * Safe to call when `label` is missing on some rows.
 */
export async function hydrateWorkAreaDisplayLabels(
  areas: ReadonlyArray<{
    province_code: number;
    ward_code?: number;
    label?: string;
  }>
): Promise<
  Array<{
    province_code: number;
    ward_code?: number;
    label?: string;
  }>
> {
  const provinceNames = await getProvinceNameByCode();

  return Promise.all(
    areas.map(async (a) => {
      if (a.label?.trim()) {
        return { ...a };
      }

      const provName = provinceNames.get(a.province_code);

      if (a.ward_code == null || a.ward_code === undefined) {
        const label = provName
          ? shortProvinceLabel(provName)
          : String(a.province_code);
        return { ...a, label };
      }

      const ward = await fetchWardByCode(a.ward_code);
      const provinceFull =
        provinceNames.get(a.province_code) ??
        (ward ? provinceNames.get(ward.province_code) : undefined) ??
        "—";

      if (!ward) {
        const label = provName
          ? `${a.ward_code} · ${shortProvinceLabel(provName)}`
          : `${a.province_code}:${a.ward_code}`;
        return { ...a, label };
      }

      const label = compactWardRowLabel(ward.name, provinceFull);
      return {
        ...a,
        province_code: a.province_code,
        ward_code: ward.code,
        label,
      };
    })
  );
}

export async function searchHeroWorkArea(
  query: string
): Promise<HeroWorkAreaOption[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }
  const qFold = foldSearchKey(q);

  const [provinces, wards] = await Promise.all([
    fetchProvincesList(),
    searchWorkLocations(q, 0),
  ]);

  const provinceHits = provinces
    .filter((p) => foldSearchKey(p.label).includes(qFold))
    .slice(0, HERO_MAX_PROVINCE_HITS);

  const wardHits = wards.slice(0, HERO_MAX_WARD_HITS);

  const out: HeroWorkAreaOption[] = [];
  for (const p of provinceHits) {
    const label = shortProvinceLabel(p.label);
    out.push({
      value: label,
      label,
      kind: "province",
      province_code: p.value,
    });
  }
  for (const w of wardHits) {
    const label = w.label;
    out.push({
      value: label,
      label,
      kind: "ward",
      province_code: w.province_code,
      ward_code: w.ward_code,
    });
  }
  return out;
}

export async function searchWorkLocations(
  query: string,
  provinceFilter = 0
): Promise<WorkLocationOption[]> {
  const trimmed = query.trim();
  const provinceNames = await getProvinceNameByCode();
  const provinceOptions: ProvinceOption[] = Array.from(
    provinceNames.entries(),
    ([value, label]) => ({ value, label })
  );

  let effectiveProvince = provinceFilter;
  let searchText = trimmed;

  if (effectiveProvince === 0 && trimmed.length >= 2) {
    const inferred = resolveProvinceFilterFromQuery(trimmed, provinceOptions);
    if (inferred !== 0) {
      effectiveProvince = inferred;
      const narrowed = narrowQueryForWardSearch(
        trimmed,
        provinceOptions,
        inferred
      );
      searchText = narrowed.length >= 2 ? narrowed : trimmed;
    }
  }

  const res = await fetch(
    `/api/vn/wards?search=${encodeURIComponent(searchText)}&province=${effectiveProvince}`
  );
  if (!res.ok) {
    return [];
  }
  const json: unknown = await res.json();
  const parsed = wardsResponseSchema.safeParse(json);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map((w) => {
    const provinceLabel = provinceNames.get(w.province_code) ?? "—";
    return {
      value: String(w.code),
      label: compactWardRowLabel(w.name, provinceLabel),
      province_code: w.province_code,
      ward_code: w.code,
    };
  });
}
