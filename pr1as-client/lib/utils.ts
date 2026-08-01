import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
