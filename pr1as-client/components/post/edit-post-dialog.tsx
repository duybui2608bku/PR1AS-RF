"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePost } from "@/lib/hooks/use-posts"
import type { PostPublic, PostVisibility } from "@/types"

type Props = {
  post: PostPublic
  onClose: () => void
}

export function EditPostDialog({ post, onClose }: Props) {
  const t = useTranslations("EditPost")
  const [body, setBody] = useState(post.body)
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility)
  const updateMutation = useUpdatePost(post.id)

  const handleSubmit = async () => {
    if (!body.trim()) return

    try {
      await updateMutation.mutateAsync({ body: body.trim(), visibility })
      onClose()
    } catch {
    }
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) onClose()
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("bodyPlaceholder")}
            rows={6}
            maxLength={5000}
          />
          <div className="flex items-center justify-between gap-3">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as PostVisibility)}
            >
              <option value="public">{t("public")}</option>
              <option value="private">{t("private")}</option>
            </select>
            <span className="text-xs text-muted-foreground">{body.length}/5000</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!body.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
