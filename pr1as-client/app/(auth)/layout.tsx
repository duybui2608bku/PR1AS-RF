import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Tài khoản",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar tối giản: nút quay lại + đổi theme. Không viền để liền mạch như app. */}
      <header className="pt-safe px-safe">
        <div className="flex h-14 items-center justify-between px-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-1 text-muted-foreground"
          >
            <Link href="/">
              <ChevronLeft className="size-4" />
              Trang chủ
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile: nội dung tràn màn hình. Desktop (sm+): gom vào card căn giữa. */}
      <main className="flex flex-1 flex-col px-4 pb-safe sm:items-center sm:justify-center sm:py-8">
        <div className="flex w-full flex-1 flex-col pb-6 pt-2 sm:max-w-md sm:flex-none sm:rounded-3xl sm:border sm:bg-card sm:p-8 sm:shadow-xl">
          {children}
        </div>
      </main>
    </div>
  )
}
