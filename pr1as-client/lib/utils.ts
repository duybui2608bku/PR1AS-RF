import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deterministic per-tag colour (same tag → same colour everywhere, no flicker
 * on re-render). Classes must stay literal so Tailwind keeps them.
 */
const TAG_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
]

export function tagColorClass(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }
  return TAG_COLORS[hash % TAG_COLORS.length]
}

/**
 * Where a post/comment author's name and avatar link to: workers get their
 * public marketplace profile, everyone else gets the client profile page.
 */
export function authorProfileHref(author: {
  id: string
  has_worker_profile: boolean
}) {
  if (!author.id) return null
  return author.has_worker_profile
    ? `/worker/${author.id}`
    : `/customer/${author.id}`
}

/**
 * Builds a /chat link that pre-fills the receiver's name/avatar in the URL,
 * so a brand-new conversation (no messages yet) can show the correct header
 * instead of a generic "new message" placeholder.
 */
export function buildChatHref(
  receiverId: string,
  info?: { name?: string | null; avatar?: string | null }
) {
  const searchParams = new URLSearchParams({ receiver_id: receiverId })
  if (info?.name) searchParams.set("receiver_name", info.name)
  if (info?.avatar) searchParams.set("receiver_avatar", info.avatar)
  return `/chat?${searchParams.toString()}`
}
