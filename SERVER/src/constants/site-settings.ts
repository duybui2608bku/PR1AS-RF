export const SITE_SETTINGS_MESSAGES = {
  FETCHED: "Site settings fetched successfully",
  UPDATED: "Site settings updated successfully",
  RESET: "Site settings reset to defaults",
} as const;

export const SITE_SETTINGS_DEFAULTS = {
  name: "PR1AS",
  shortName: "PR1AS",
  description:
    "PR1AS kết nối khách hàng với worker và freelancer uy tín để tìm dịch vụ, đặt lịch, quản lý booking và thanh toán trực tuyến.",
  logoUrl: "",
  faviconUrl: "",
  siteUrl: "https://pr1as.com",
  contactEmail: "pr1as.connect@gmail.com",
  ogImageUrl: "",
  keywords:
    "PR1AS, booking dịch vụ, freelancer Việt Nam, đặt lịch dịch vụ, worker marketplace",
  twitterHandle: "",
  facebook: "https://www.facebook.com/pr1as",
  twitter: "https://twitter.com/",
  zalo: "https://zalo.me/0909090909",
  github: "https://github.com/",
  maintenanceMode: false,
  maintenanceMessage:
    "Hệ thống đang được bảo trì và nâng cấp. Vui lòng quay lại sau.",
} as const;
