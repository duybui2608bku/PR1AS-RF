export type NavItem = {
  title: string
  href: string
  key?: string
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

export const footerNav: { title: string; key: string; items: NavItem[] }[] = [
  {
    title: "Sản phẩm",
    key: "product",
    items: [
      { title: "Tính năng", href: "/features", key: "features" },
      { title: "Bảng giá", href: "/pricing", key: "pricing" },
    ],
  },
  {
    title: "Công ty",
    key: "company",
    items: [
      { title: "Giới thiệu", href: "/about", key: "about" },
      { title: "Liên hệ", href: "/contact", key: "contact" },
    ],
  },
  {
    title: "Pháp lý",
    key: "legal",
    items: [
      { title: "Chính sách bảo mật", href: "/privacy", key: "privacy" },
      { title: "Điều khoản sử dụng", href: "/terms", key: "terms" },
    ],
  },
]
