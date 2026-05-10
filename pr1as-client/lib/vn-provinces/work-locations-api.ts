const BASE = "https://provinces.open-api.vn/api/v2"

export const WORK_LOCATIONS_MAX = 5

export type ProvinceOption = {
  code: number
  name: string
  short_name: string
  division_type: string
}

export type WardOption = {
  code: number
  name: string
  province_code: number
}

export type WorkLocationOption =
  | { kind: "PROVINCE"; province_code: number; label: string }
  | {
      kind: "WARD"
      province_code: number
      ward_code: number
      label: string
    }

type RawProvince = {
  code: number
  name: string
  division_type: string
  codename?: string
}

type RawWard = {
  code: number
  name: string
  division_type: string
  province_code: number
}

type RawProvinceWithWards = RawProvince & { wards: RawWard[] }

let provincesCache: ProvinceOption[] | null = null
let provincesPromise: Promise<ProvinceOption[]> | null = null

const wardsCache = new Map<number, WardOption[]>()
const wardsPromise = new Map<number, Promise<WardOption[]>>()

let allWardsCache: WardOption[] | null = null
let allWardsPromise: Promise<WardOption[]> | null = null

const PROVINCE_PREFIXES = ["thành phố ", "tỉnh "]

function stripProvincePrefix(name: string): string {
  const lower = name.toLowerCase()
  for (const prefix of PROVINCE_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return name.slice(prefix.length).trim()
    }
  }
  return name
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getProvinces(): Promise<ProvinceOption[]> {
  if (provincesCache) return provincesCache
  if (provincesPromise) return provincesPromise

  provincesPromise = fetchJson<RawProvince[]>("/p/")
    .then((rows) => {
      const list: ProvinceOption[] = rows
        .map((r) => ({
          code: r.code,
          name: r.name,
          short_name: stripProvincePrefix(r.name),
          division_type: r.division_type,
        }))
        .sort((a, b) => a.short_name.localeCompare(b.short_name, "vi"))
      provincesCache = list
      return list
    })
    .finally(() => {
      provincesPromise = null
    })

  return provincesPromise
}

export async function getWardsByProvince(
  provinceCode: number,
): Promise<WardOption[]> {
  const cached = wardsCache.get(provinceCode)
  if (cached) return cached

  const inflight = wardsPromise.get(provinceCode)
  if (inflight) return inflight

  const promise = fetchJson<RawProvinceWithWards>(
    `/p/${provinceCode}?depth=2`,
  )
    .then((data) => {
      const list: WardOption[] = (data.wards ?? [])
        .map((w) => ({
          code: w.code,
          name: w.name,
          province_code: data.code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "vi"))
      wardsCache.set(provinceCode, list)
      return list
    })
    .finally(() => {
      wardsPromise.delete(provinceCode)
    })

  wardsPromise.set(provinceCode, promise)
  return promise
}

export function formatProvinceLabel(p: ProvinceOption): string {
  return p.name
}

export function formatWardLabel(w: WardOption, p: ProvinceOption): string {
  return `${w.name}, ${p.short_name}`
}

export async function getAllWards(): Promise<WardOption[]> {
  if (allWardsCache) return allWardsCache
  if (allWardsPromise) return allWardsPromise

  allWardsPromise = fetchJson<RawWard[]>("/w/")
    .then((rows) => {
      const list: WardOption[] = rows.map((r) => ({
        code: r.code,
        name: r.name,
        province_code: r.province_code,
      }))
      allWardsCache = list

      const grouped = new Map<number, WardOption[]>()
      for (const w of list) {
        const arr = grouped.get(w.province_code) ?? []
        arr.push(w)
        grouped.set(w.province_code, arr)
      }
      for (const [code, arr] of grouped) {
        if (!wardsCache.has(code)) {
          wardsCache.set(
            code,
            arr.slice().sort((a, b) => a.name.localeCompare(b.name, "vi")),
          )
        }
      }

      return list
    })
    .finally(() => {
      allWardsPromise = null
    })

  return allWardsPromise
}

export type LocationSearchResult =
  | {
      kind: "PROVINCE"
      province_code: number
      label: string
      short_name: string
    }
  | {
      kind: "WARD"
      province_code: number
      ward_code: number
      ward_name: string
      province_short_name: string
      label: string
    }

const PROVINCE_PREVIEW_WARDS = 8
const MAX_RESULTS = 40

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

export function searchLocationOptions(
  q: string,
  provinces: ProvinceOption[],
  allWards: WardOption[],
): LocationSearchResult[] {
  const norm = normalizeText(q)
  if (norm.length < 1) return []

  const matchedProvinces = provinces.filter(
    (p) =>
      normalizeText(p.short_name).includes(norm) ||
      normalizeText(p.name).includes(norm),
  )
  const matchedWards = allWards
    .filter((w) => normalizeText(w.name).includes(norm))
    .slice(0, 50)

  const results: LocationSearchResult[] = []
  const seenProvinces = new Set<number>()
  const seenWards = new Set<number>()
  const provinceMap = new Map(provinces.map((p) => [p.code, p]))

  for (const p of matchedProvinces) {
    results.push({
      kind: "PROVINCE",
      province_code: p.code,
      label: p.name,
      short_name: p.short_name,
    })
    seenProvinces.add(p.code)
  }

  for (const w of matchedWards) {
    const p = provinceMap.get(w.province_code)
    if (!p) continue
    if (!seenProvinces.has(p.code)) {
      results.push({
        kind: "PROVINCE",
        province_code: p.code,
        label: p.name,
        short_name: p.short_name,
      })
      seenProvinces.add(p.code)
    }
    if (!seenWards.has(w.code)) {
      results.push({
        kind: "WARD",
        province_code: p.code,
        ward_code: w.code,
        ward_name: w.name,
        province_short_name: p.short_name,
        label: `${w.name}, ${p.short_name}`,
      })
      seenWards.add(w.code)
    }
  }

  for (const p of matchedProvinces) {
    const previews = allWards
      .filter((w) => w.province_code === p.code)
      .slice(0, PROVINCE_PREVIEW_WARDS)
    for (const w of previews) {
      if (seenWards.has(w.code)) continue
      results.push({
        kind: "WARD",
        province_code: p.code,
        ward_code: w.code,
        ward_name: w.name,
        province_short_name: p.short_name,
        label: `${w.name}, ${p.short_name}`,
      })
      seenWards.add(w.code)
    }
  }

  return results.slice(0, MAX_RESULTS)
}
