import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Lịch làm việc",
}

export default function WorkerScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
