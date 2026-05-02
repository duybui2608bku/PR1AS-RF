"use client"

import { Suspense } from "react"
import { Spin } from "antd"
import { AuthGuard } from "@/lib/components/auth-guard"
import { WorkerFeedContent } from "./components/worker-feed-content"

const WorkerFeedFallback = () => (
  <div style={{ padding: 48, textAlign: "center" }}>
    <Spin size="large" />
  </div>
)

export default function WorkerFeedPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<WorkerFeedFallback />}>
        <WorkerFeedContent />
      </Suspense>
    </AuthGuard>
  )
}
