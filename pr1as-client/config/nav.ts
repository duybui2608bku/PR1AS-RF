export type NavItem = {
  title: string
  href: string
  external?: boolean
  disabled?: boolean
}

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Bảng tin", href: "/posts" },
  { title: "About", href: "/about" },
  { title: "Pricing", href: "/pricing" },
  { title: "Contact", href: "/contact" },
]

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Sản phẩm",
    items: [
      { title: "Tính năng", href: "/features" },
      { title: "Bảng giá", href: "/pricing" },
    ],
  },
  {
    title: "Công ty",
    items: [
      { title: "Giới thiệu", href: "/about" },
      { title: "Liên hệ", href: "/contact" },
    ],
  },
  {
    title: "Pháp lý",
    items: [
      { title: "Chính sách bảo mật", href: "/privacy" },
      { title: "Điều khoản sử dụng", href: "/terms" },
    ],
  },
]
