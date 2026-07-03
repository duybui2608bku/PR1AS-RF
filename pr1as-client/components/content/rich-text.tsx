import { cn } from "@/lib/utils"

/**
 * Render admin-authored, sanitized rich-text HTML as a block. Content comes
 * from the admin-controlled content APIs (about / legal / contact), which the
 * backend sanitizes before storage.
 */
export function RichText({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
