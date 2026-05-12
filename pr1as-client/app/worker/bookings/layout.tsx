import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Booking worker",
}

export default function WorkerBookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
