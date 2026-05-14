"use client"

export function WorkerSuggestions() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-4">
      <div className="mb-4 rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground">
        Worker đề xuất (placeholder)
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 p-3"
          >
            <div className="size-12 shrink-0 rounded-full border border-dashed border-muted-foreground/30" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded border border-dashed border-muted-foreground/30" />
              <div className="h-3 w-1/2 rounded border border-dashed border-muted-foreground/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
