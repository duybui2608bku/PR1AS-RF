export const ANNOUNCEMENT_PLACEMENTS = [
  { value: "home_client_popup", label: "Trang chủ Client Popup" },
  { value: "home_client_banner", label: "Trang chủ Client Banner" },
  { value: "home_client_inline", label: "Trang chủ Client Inline" },
  { value: "home_worker_popup", label: "Trang chủ Worker Popup" },
  { value: "home_worker_banner", label: "Trang chủ Worker Banner" },
  { value: "home_worker_inline", label: "Trang chủ Worker Inline" },
] as const

export type PlacementValue = (typeof ANNOUNCEMENT_PLACEMENTS)[number]["value"]
