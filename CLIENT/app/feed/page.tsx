"use client"

import { Suspense } from "react"
import { Spin } from "antd"
import { AuthGuard } from "@/lib/components/auth-guard"
import { FeedPageContent } from "./components/feed-page-content"

const FeedFallback = () => (
  <div style={{ padding: 48, textAlign: "center" }}>
    <Spin size="large" />
  </div>
)

export default function FeedPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<FeedFallback />}>
        <FeedPageContent />
      </Suspense>
    </AuthGuard>
  )
}
