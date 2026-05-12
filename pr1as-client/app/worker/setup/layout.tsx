import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Thiết lập worker",
}

export default function WorkerSetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
