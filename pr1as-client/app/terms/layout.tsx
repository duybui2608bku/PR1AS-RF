import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Điều khoản sử dụng",
  description:
    "Điều khoản sử dụng PR1AS cho tài khoản, đặt lịch, thanh toán, gói dịch vụ và trách nhiệm của người dùng.",
  path: "/terms",
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
