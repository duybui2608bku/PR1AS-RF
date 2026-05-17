export const siteConfig = {
  name: "PR1AS",
  shortName: "PR1AS",
  description:
    "PR1AS kết nối khách hàng với worker và freelancer uy tín để tìm dịch vụ, đặt lịch, quản lý booking và thanh toán trực tuyến.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://pr1as.com",
  ogImage: "/opengraph-image",
  links: {
    github: "https://github.com/",
    twitter: "https://twitter.com/",
    zalo: "https://zalo.me/0909090909",
    facebook: "https://www.facebook.com/pr1as",
  },
  contactEmail: "pr1as.connect@gmail.com",
} as const

export type SiteConfig = typeof siteConfig
