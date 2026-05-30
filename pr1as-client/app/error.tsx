"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("[route-error]", error)
  }, [error])

  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-destructive text-sm font-medium">Đã xảy ra lỗi</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Ứng dụng gặp lỗi ngoài ý muốn
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Vui lòng thử lại. Nếu lỗi vẫn tiếp diễn, hãy liên hệ hỗ trợ.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground/80 font-mono text-xs">
          Mã lỗi: {error.digest}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Thử lại</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          Về trang chủ
        </Button>
      </div>
    </div>
  )
}
