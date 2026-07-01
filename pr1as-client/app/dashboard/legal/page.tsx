"use client"

import { useState } from "react"
import { ScrollText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LegalEditor } from "@/components/dashboard/legal-editor"
import { type LegalPageKey } from "@/services/legal.service"

const PAGES: { key: LegalPageKey; label: string }[] = [
  { key: "privacy", label: "Chính sách bảo mật" },
  { key: "terms", label: "Điều khoản sử dụng" },
]

export default function AdminLegalPage() {
  const [page, setPage] = useState<LegalPageKey>("privacy")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScrollText className="size-6" />
          Trang pháp lý
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chỉnh sửa nội dung trang Chính sách bảo mật và Điều khoản sử dụng cho
          từng ngôn ngữ.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PAGES.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={page === p.key ? "default" : "outline"}
            onClick={() => setPage(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Remount per page so each editor manages its own draft/query. */}
      <LegalEditor key={page} page={page} />
    </div>
  )
}
