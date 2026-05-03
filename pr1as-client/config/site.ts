export const siteConfig = {
  name: "PR1AS",
  shortName: "PR1AS",
  description: "PR1AS client application.",
  url: "https://pr1as.com",
  ogImage: "/og.png",
  links: {
    github: "https://github.com/",
    twitter: "https://twitter.com/",
  },
  contactEmail: "support@pr1as.com",
} as const

export type SiteConfig = typeof siteConfig
