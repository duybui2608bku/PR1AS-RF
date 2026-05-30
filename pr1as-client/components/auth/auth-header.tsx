import * as React from "react"

import { cn } from "@/lib/utils"

/** Brand mark mặc định — ô bo góc chữ "P", khớp với icon PWA. */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="text-2xl font-bold leading-none tracking-tight">P</span>
    </div>
  )
}

interface AuthHeaderProps {
  title: string
  subtitle?: React.ReactNode
  /** Thay brand mark mặc định (vd: icon trạng thái success/error). */
  mark?: React.ReactNode
  className?: string
}

/** Header dùng chung cho các trang auth: mark trên cùng + tiêu đề + mô tả, căn giữa. */
export function AuthHeader({ title, subtitle, mark, className }: AuthHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      {mark ?? <AuthBrandMark />}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-balance text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
