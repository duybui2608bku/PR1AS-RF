import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Không tìm thấy trang</h1>
      <p className="text-muted-foreground max-w-md">
        Trang bạn đang tìm có thể đã được chuyển hoặc xóa.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className={buttonVariants()}>
          Về trang chủ
        </Link>
        <Link
          href={`mailto:${siteConfig.contactEmail}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Liên hệ hỗ trợ
        </Link>
      </div>
    </div>
  )
}
