import { redirect } from "next/navigation"

// Trang chủ mặc định cho khách / worker / client là /about.
// Admin được middleware redirect sang /dashboard trước khi tới đây.
export default function RootPage() {
  redirect("/about")
}
