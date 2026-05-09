const BASE = "https://provinces.open-api.vn/api"

export const WORK_LOCATIONS_MAX = 5

export type WorkLocationOption = {
  value: string
  label: string
  province_code: number
  ward_code: number
}

type WardSearchRow = { name: string; code: number }

type WardDetail = {
  name: string
  code: number
  district_code: number
}

type DistrictDetail = {
  name: string
  code: number
  province_code: number
}

const wardCache = new Map<number, WardDetail>()
const districtCache = new Map<number, DistrictDetail>()

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function getWardDetail(code: number): Promise<WardDetail> {
  const hit = wardCache.get(code)
  if (hit) return hit
  const d = await fetchJson<WardDetail>(`/w/${code}`)
  wardCache.set(code, d)
  return d
}

async function getDistrictDetail(code: number): Promise<DistrictDetail> {
  const hit = districtCache.get(code)
  if (hit) return hit
  const d = await fetchJson<DistrictDetail>(`/d/${code}`)
  districtCache.set(code, d)
  return d
}

export async function searchWorkLocations(q: string): Promise<WorkLocationOption[]> {
  const query = q.trim()
  if (query.length < 1) return []

  const rows = await fetchJson<WardSearchRow[]>(
    `/w/search/?q=${encodeURIComponent(query)}`,
  )
  const slice = rows.slice(0, 40)

  const results: WorkLocationOption[] = []
  for (const row of slice) {
    try {
      const ward = await getWardDetail(row.code)
      const district = await getDistrictDetail(ward.district_code)
      results.push({
        value: String(ward.code),
        label: `${ward.name}, ${district.name}`,
        province_code: district.province_code,
        ward_code: ward.code,
      })
    } catch {
      // skip invalid row
    }
  }
  return results
}
