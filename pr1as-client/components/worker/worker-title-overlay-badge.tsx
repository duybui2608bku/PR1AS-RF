type WorkerTitleOverlayBadgeProps = {
  title: string
}

export function WorkerTitleOverlayBadge({ title }: WorkerTitleOverlayBadgeProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-10">
      <p className="text-xs font-semibold text-white leading-snug break-words [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
        {title}
      </p>
    </div>
  )
}
