import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Chính sách bảo mật",
  description:
    "Chính sách bảo mật của PR1AS về cách thu thập, sử dụng, chia sẻ và bảo vệ thông tin cá nhân của người dùng.",
  path: "/privacy",
})

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
