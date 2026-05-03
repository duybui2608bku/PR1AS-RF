"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-destructive text-sm font-medium">Something went wrong</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">An unexpected error occurred</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {error.message || "Please try again. If the issue persists, contact support."}
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>Go home</Button>
      </div>
    </div>
  )
}
