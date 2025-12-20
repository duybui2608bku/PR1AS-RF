import { ReactNode } from "react";

/**
 * Layout riêng cho trang admin
 * Không import globals.scss để tránh ảnh hưởng CSS tùy chỉnh
 * Chỉ sử dụng mặc định của Ant Design
 */
export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

