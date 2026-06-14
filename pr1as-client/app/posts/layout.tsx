import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("postsTitle"),
    description: t("postsDescription"),
    path: "/posts",
  })
}

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return children
}
