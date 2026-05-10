export const siteConfig = {
  name: "PR1AS",
  shortName: "PR1AS",
  description: "PR1AS client application.",
  url: "https://pr1as.com",
  ogImage: "/og.png",
  links: {
    github: "https://github.com/",
    twitter: "https://twitter.com/",
    zalo: "https://zalo.me/0909090909",
  },
  contactEmail: "pr1as.connect@gmail.com",
} as const

export type SiteConfig = typeof siteConfig
