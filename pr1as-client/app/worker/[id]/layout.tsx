import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

type WorkerProfileLayoutProps = {
  children: React.ReactNode
}

type WorkerProfileMetadataProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: WorkerProfileMetadataProps) {
  const { id } = await params
  const t = await getTranslations("SEO")

  return createPageMetadata({
    title: t("workerProfileTitle"),
    description: t("workerProfileDescription"),
    path: `/worker/${id}`,
  })
}

export default function WorkerProfileLayout({
  children,
}: WorkerProfileLayoutProps) {
  return children
}
