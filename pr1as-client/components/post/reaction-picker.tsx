"use client"

import { useState } from "react"
import { ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { useTogglePostReaction } from "@/lib/hooks/use-reactions"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import type {
  PostPublic,
  ReactionSummaryPublic,
  ReactionType,
} from "@/types"
import { REACTION_TYPES } from "@/types"

export const REACTION_META: Record<
  ReactionType,
  { emoji: string; label: string; color: string }
> = {
  like: { emoji: "👍", label: "Thích", color: "text-blue-600" },
  love: { emoji: "❤️", label: "Yêu thích", color: "text-rose-600" },
  haha: { emoji: "😆", label: "Haha", color: "text-amber-500" },
  wow: { emoji: "😮", label: "Wow", color: "text-amber-500" },
  sad: { emoji: "😢", label: "Buồn", color: "text-amber-500" },
  angry: { emoji: "😡", label: "Phẫn nộ", color: "text-orange-600" },
}

export function topReactionTypes(summary: ReactionSummaryPublic): ReactionType[] {
  const entries = Object.entries(summary.counts ?? {}) as [
    ReactionType,
    number,
  ][]
  return entries
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type)
}

export function ReactionPicker({ post }: { post: PostPublic }) {
  const [open, setOpen] = useState(false)
  const toggleReaction = useTogglePostReaction(post.id)
  const { requireAuth } = useAuthRequired()
  const summary = post.reactions
  const myReaction = summary.my_reaction
  const myMeta = myReaction ? REACTION_META[myReaction] : null
  const top = topReactionTypes(summary)

  const handleToggle = (type: ReactionType) => {
    requireAuth(() => {
      if (toggleReaction.isPending) return
      toggleReaction.mutate({ type, currentReaction: myReaction })
      setOpen(false)
    })
  }

  const triggerLabel = myMeta?.label ?? "Thích"

  return (
    <div className="flex flex-1 items-center gap-2">
      <HoverCard
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            requireAuth(() => setOpen(true))
          } else {
            setOpen(false)
          }
        }}
        openDelay={150}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "flex-1 gap-1.5 text-muted-foreground",
              myMeta && myMeta.color,
              myMeta && "font-semibold",
            )}
            onClick={() => handleToggle(myReaction ?? "like")}
            disabled={toggleReaction.isPending}
          >
            {myMeta ? (
              <span className="text-base leading-none">{myMeta.emoji}</span>
            ) : (
              <ThumbsUp className="size-4" />
            )}
            {triggerLabel}
          </Button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          className="flex w-auto items-center gap-1 rounded-full border bg-popover p-1.5 shadow-lg"
        >
          {REACTION_TYPES.map((type) => {
            const meta = REACTION_META[type]
            const isActive = myReaction === type
            return (
              <button
                key={type}
                type="button"
                aria-label={meta.label}
                title={meta.label}
                disabled={toggleReaction.isPending}
                onClick={() => handleToggle(type)}
                className={cn(
                  "rounded-full p-1 text-2xl leading-none transition-transform hover:-translate-y-0.5 hover:scale-125",
                  isActive && "ring-2 ring-primary",
                )}
              >
                {meta.emoji}
              </button>
            )
          })}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
