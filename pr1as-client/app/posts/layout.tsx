import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Bảng tin",
  description:
    "Cập nhật bài viết, ý tưởng dự án, hashtag nổi bật và kết nối cộng đồng người dùng PR1AS.",
  path: "/posts",
})

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return children
}
