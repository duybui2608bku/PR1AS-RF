import { Badge } from "@/components/ui/badge"

type WorkerTitleOverlayBadgeProps = {
  title: string
}

export function WorkerTitleOverlayBadge({ title }: WorkerTitleOverlayBadgeProps) {
  return (
    <div className="absolute bottom-2 left-2 right-2">
      <Badge
        variant="default"
        className="h-auto max-w-full truncate border-0 bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-lg ring-1 ring-white/40"
      >
        {title}
      </Badge>
    </div>
  )
}
