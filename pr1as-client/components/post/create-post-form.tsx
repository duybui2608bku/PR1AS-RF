"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Globe, ImagePlus, Loader2, Lock, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePost } from "@/lib/hooks/use-posts"
import { useAuthStore } from "@/lib/store/auth-store"
import { uploadMultipleImages } from "@/lib/utils/upload-image"
import type { PostVisibility } from "@/types"

const MAX_IMAGES = 10
const MAX_BODY = 5000

type ImagePreview = {
  file: File
  previewUrl: string
}

export function CreatePostForm() {
  const { user } = useAuthStore()
  const createMutation = useCreatePost()

  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<PostVisibility>("public")
  const [previews, setPreviews] = useState<ImagePreview[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - previews.length
    const selected = files.slice(0, remaining)

    const newPreviews = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPreviews((prev) => [...prev, ...newPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!body.trim() && previews.length === 0) return

    let mediaPayload: { type: "image"; url: string; sort_order: number }[] = []
    if (previews.length > 0) {
      setUploading(true)
      try {
        const urls = await uploadMultipleImages(previews.map((p) => p.file))
        mediaPayload = urls.map((url, i) => ({ type: "image", url, sort_order: i }))
      } catch {
        setUploading(false)
        return
      }
      setUploading(false)
    }

    await createMutation.mutateAsync({
      body: body.trim(),
      visibility,
      media: mediaPayload.length > 0 ? mediaPayload : undefined,
    })

    setBody("")
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
  }

  const isPending = uploading || createMutation.isPending
  const canSubmit = (body.trim().length > 0 || previews.length > 0) && !isPending

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        {user?.avatar ? (
          <Image
            src={user.avatar}
            alt={user.full_name ?? "Avatar"}
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bạn đang nghĩ gì? Dùng #hashtag để phân loại bài viết..."
            rows={3}
            maxLength={MAX_BODY}
            className="resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />

          {/* Image Previews */}
          {previews.length > 0 ? (
            <div className={`grid gap-2 ${previews.length >= 3 ? "grid-cols-3" : previews.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {previews.map((p, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
                  <Image src={p.previewUrl} alt={`Preview ${i + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={previews.length >= MAX_IMAGES || isPending}
              >
                <ImagePlus className="size-4" />
                <span className="text-xs">Ảnh</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />

              <div className="flex items-center gap-1.5">
                {visibility === "public" ? (
                  <Globe className="size-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="size-3.5 text-muted-foreground" />
                )}
                <select
                  className="border-0 bg-transparent text-xs text-muted-foreground focus:outline-none"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as PostVisibility)}
                  disabled={isPending}
                >
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {body.length > 0 ? (
                <span className={`text-xs ${body.length > 4800 ? "text-red-500" : "text-muted-foreground"}`}>
                  {body.length}/{MAX_BODY}
                </span>
              ) : null}
              <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
                {isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                {uploading ? "Đang tải ảnh..." : "Đăng bài"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
