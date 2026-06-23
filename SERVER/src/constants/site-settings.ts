export const SITE_SETTINGS_MESSAGES = {
  FETCHED: "Site settings fetched successfully",
  UPDATED: "Site settings updated successfully",
  RESET: "Site settings reset to defaults",
} as const;

export const SITE_SETTINGS_DEFAULTS = {
  name: "PR1AS",
  shortName: "PR1AS",
  description: {
    vi: "PR1AS kết nối khách hàng với worker và freelancer uy tín để tìm dịch vụ, đặt lịch, quản lý booking và thanh toán trực tuyến.",
    en: "PR1AS connects customers with trusted workers and freelancers to find services, book appointments, manage bookings and pay online.",
    zh: "PR1AS 连接客户与值得信赖的工作者和自由职业者，帮助查找服务、预约、管理订单并在线付款。",
    ko: "PR1AS는 신뢰할 수 있는 작업자와 프리랜서를 연결해 서비스를 찾고, 예약하고, 예약을 관리하고, 온라인으로 결제할 수 있게 해줍니다.",
  },
  logoUrl: "",
  faviconUrl: "",
  siteUrl: "https://pr1as.com",
  contactEmail: "pr1as.connect@gmail.com",
  ogImageUrl: "",
  keywords: {
    vi: "PR1AS, booking dịch vụ, freelancer Việt Nam, đặt lịch dịch vụ, worker marketplace",
    en: "PR1AS, service booking, freelancers, online booking, worker marketplace",
    zh: "PR1AS, 服务预约, 自由职业者, 在线预约, 工作者市场",
    ko: "PR1AS, 서비스 예약, 프리랜서, 온라인 예약, 작업자 마켓플레이스",
  },
  twitterHandle: "",
  facebook: "https://www.facebook.com/pr1as",
  tiktok: "https://www.tiktok.com/@pr1as",
  thread: "https://www.threads.net/@pr1as",
  instagram: "https://www.instagram.com/pr1as",
  maintenanceMode: false,
  maintenanceMessage:
    "Hệ thống đang được bảo trì và nâng cấp. Vui lòng quay lại sau.",
} as const;
