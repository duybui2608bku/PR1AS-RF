import type { WorkLocationOption } from "@/lib/vn-provinces/work-locations-api";

/** Offline / legacy mock options with synthetic codes for Storybook or tests. */
const MOCK_LOCATIONS: WorkLocationOption[] = [
  {
    value: "999001",
    label: "Quận 1 (mock) · TP.HCM",
    province_code: 79,
    ward_code: 999001,
  },
  {
    value: "999002",
    label: "Ba Đình (mock) · Hà Nội",
    province_code: 1,
    ward_code: 999002,
  },
];

const MOCK_DELAY_MS = 280;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export type { WorkLocationOption };

export async function searchWorkLocationsMock(
  query: string
): Promise<WorkLocationOption[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  const q = normalize(query);
  if (!q) {
    return MOCK_LOCATIONS.slice(0, 12);
  }
  return MOCK_LOCATIONS.filter(
    (o) =>
      normalize(o.label).includes(q) ||
      normalize(o.value).includes(q)
  );
}
