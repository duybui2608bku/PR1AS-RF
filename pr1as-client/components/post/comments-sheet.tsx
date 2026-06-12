"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import { PostComments } from "@/components/post/post-comments"
import { cn } from "@/lib/utils"

interface CommentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  commentsCount: number
  currentUserId?: string
  isAuthenticated: boolean
  commentsLocked?: boolean
  canBypassLock?: boolean
  isPostOwner?: boolean
}

/**
 * Khung bình luận: bottom sheet trên mobile, modal căn giữa trên desktop.
 * Header cố định + danh sách cuộn + composer ghim đáy (do PostComments lo).
 */
export function CommentsSheet({
  open,
  onOpenChange,
  postId,
  commentsCount,
  currentUserId,
  isAuthenticated,
  commentsLocked,
  canBypassLock,
  isPostOwner,
}: CommentsSheetProps) {
  const t = useTranslations("CommentsSheet")
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[55] bg-black/50",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-[60] flex flex-col bg-background shadow-xl outline-none duration-300",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl border-t",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            // Desktop: modal căn giữa
            "sm:inset-0 sm:m-auto sm:h-[80vh] sm:max-h-[680px] sm:w-full sm:max-w-lg sm:rounded-2xl sm:border",
          )}
        >
          {/* Drag handle — chỉ mobile */}
          <div className="flex justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header cố định */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <DialogPrimitive.Title className="text-base font-semibold">
              {t("title")}
              {commentsCount > 0 ? ` (${commentsCount})` : ""}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t("close")}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-transform hover:bg-accent active:scale-90"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <PostComments
            postId={postId}
            enabled={open}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            commentsLocked={commentsLocked}
            canBypassLock={canBypassLock}
            isPostOwner={isPostOwner}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
