export const siteConfig = {
  name: "PR1AS",
  shortName: "PR1AS",
  description:
    "PR1AS kết nối khách hàng với worker và freelancer uy tín để tìm dịch vụ, đặt lịch, quản lý booking và thanh toán trực tuyến.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://pr1as.com",
  ogImage: "/opengraph-image",
  links: {
    facebook: "https://www.facebook.com/pr1as",
    tiktok: "https://www.tiktok.com/@pr1as",
    thread: "https://www.threads.net/@pr1as",
    instagram: "https://www.instagram.com/pr1as",
  },
  contactEmail: "pr1as.connect@gmail.com",
} as const

export type SiteConfig = typeof siteConfig
