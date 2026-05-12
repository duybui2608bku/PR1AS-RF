import { createPageMetadata } from "@/lib/seo"

type WorkerProfileLayoutProps = {
  children: React.ReactNode
}

type WorkerProfileMetadataProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: WorkerProfileMetadataProps) {
  const { id } = await params

  return createPageMetadata({
    title: "Hồ sơ worker",
    description:
      "Xem hồ sơ worker, dịch vụ, đánh giá, lịch làm việc và đặt booking trực tuyến trên PR1AS.",
    path: `/worker/${id}`,
  })
}

export default function WorkerProfileLayout({
  children,
}: WorkerProfileLayoutProps) {
  return children
}
