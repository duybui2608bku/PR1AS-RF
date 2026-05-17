"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode | ((args: FallbackArgs) => React.ReactNode)
  onError?: (error: Error, info: React.ErrorInfo) => void
  resetKeys?: ReadonlyArray<unknown>
  className?: string
}

type State = {
  error: Error | null
}

type FallbackArgs = {
  error: Error
  reset: () => void
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info)
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prev: Props): void {
    if (!this.state.error) return
    if (!keysEqual(prev.resetKeys, this.props.resetKeys)) {
      this.reset()
    }
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): React.ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({ error, reset: this.reset })
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }
    return (
      <DefaultFallback
        error={error}
        reset={this.reset}
        className={this.props.className}
      />
    )
  }
}

function keysEqual(
  a?: ReadonlyArray<unknown>,
  b?: ReadonlyArray<unknown>
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
}

function DefaultFallback({
  error,
  reset,
  className,
}: FallbackArgs & { className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center",
        className
      )}
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Không hiển thị được phần này</p>
        <p className="text-xs text-muted-foreground">
          {error.message || "Đã có lỗi không mong muốn xảy ra."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={reset}>
        <RotateCcw className="mr-1.5 size-3.5" />
        Thử lại
      </Button>
    </div>
  )
}
