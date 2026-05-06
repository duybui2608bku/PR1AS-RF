"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePost } from "@/lib/hooks/use-posts"
import type { PostPublic, PostVisibility } from "@/types"

type Props = {
  post: PostPublic
  onClose: () => void
}

export function EditPostDialog({ post, onClose }: Props) {
  const [body, setBody] = useState(post.body)
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility)
  const updateMutation = useUpdatePost(post.id)

  const handleSubmit = async () => {
    if (!body.trim()) return
    await updateMutation.mutateAsync({ body: body.trim(), visibility })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Chỉnh sửa bài viết</h2>
          <Button variant="ghost" size="sm" className="size-8 p-0" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-3 p-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung bài viết..."
            rows={6}
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            >
              <option value="public">Công khai</option>
              <option value="private">Riêng tư</option>
            </select>
            <span className="text-xs text-muted-foreground">{body.length}/5000</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!body.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  )
}
