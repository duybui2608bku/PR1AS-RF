"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Globe, ImagePlus, Loader2, Lock, User, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ImageEditorDialog } from "@/components/ui/image-editor-dialog"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useImageEditorQueue } from "@/lib/hooks/use-image-editor-queue"
import { useCreatePost } from "@/lib/hooks/use-posts"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getPlanRingClass } from "@/lib/utils/plan"
import { uploadMultipleImages } from "@/lib/utils/upload-image"
import { filterValidImageFiles } from "@/lib/utils/validate-upload"
import type { PostVisibility } from "@/types"

const MAX_IMAGES = 10
const MAX_BODY = 5000

type ImagePreview = {
  file: File
  previewUrl: string
}

function UserAvatar({
  avatar,
  name,
  planCode,
  size = 10,
}: {
  avatar?: string | null
  name?: string | null
  planCode?: string | null
  size?: number
}) {
  const sizeClass = `size-${size}`
  const iconSize = size <= 8 ? "size-4" : "size-5"

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={size * 4}
        height={size * 4}
        className={cn(
          `${sizeClass} shrink-0 rounded-full object-cover`,
          getPlanRingClass(planCode)
        )}
      />
    )
  }
  return (
    <div
      className={cn(
        `flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-muted`,
        getPlanRingClass(planCode)
      )}
    >
      <User className={cn(iconSize, "text-muted-foreground")} />
    </div>
  )
}

export function CreatePostForm() {
  const { user, isAuthenticated } = useAuthStore()
  const createMutation = useCreatePost()
  const { requireAuth } = useAuthRequired()
  const isWorkerActive = isAuthenticated && isWorkerRoleActive(user)

  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<PostVisibility>("public")
  const [previews, setPreviews] = useState<ImagePreview[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const postImageEditor = useImageEditorQueue()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (fileInputRef.current) fileInputRef.current.value = ""
    const remaining = MAX_IMAGES - previews.length
    const selected = files.slice(0, remaining)
    if (!selected.length) return
    const valid = filterValidImageFiles(selected, (msg) => toast.error(msg))
    if (!valid.length) return
    postImageEditor.start(valid, (croppedFiles) => {
      const newPreviews = croppedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      setPreviews((prev) => [...prev, ...newPreviews])
    })
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
    setOpen(false)
  }

  const handleClose = (next: boolean) => {
    if (!next) {
      setBody("")
      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return []
      })
      setVisibility("public")
    }
    setOpen(next)
  }

  const isPending = uploading || createMutation.isPending
  const canSubmit = (body.trim().length > 0 || previews.length > 0) && !isPending

  if (isWorkerActive) return null

  return (
    <>
      {/* Compact trigger bar */}
      <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            avatar={user?.avatar}
            name={user?.full_name}
            planCode={user?.meta_data?.pricing_plan_code}
            size={9}
          />
          <button
            type="button"
            onClick={() => requireAuth(() => setOpen(true))}
            className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Bạn đang nghĩ gì?
          </button>
          <button
            type="button"
            onClick={() => requireAuth(() => setOpen(true))}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Thêm ảnh"
          >
            <ImagePlus className="size-5 text-green-500" />
          </button>
        </div>
      </div>

      {/* Full form dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Tạo bài viết</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 pt-1">
            <UserAvatar
              avatar={user?.avatar}
              name={user?.full_name}
              planCode={user?.meta_data?.pricing_plan_code}
            />
            <div>
              <p className="text-sm font-semibold leading-tight">
                {user?.full_name ?? "Người dùng"}
              </p>
              <div className="mt-1 flex items-center gap-1 rounded-md border px-2 py-0.5">
                {visibility === "public" ? (
                  <Globe className="size-3 text-muted-foreground" />
                ) : (
                  <Lock className="size-3 text-muted-foreground" />
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
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bạn đang nghĩ gì? Dùng #hashtag để phân loại bài viết..."
            rows={5}
            maxLength={MAX_BODY}
            autoFocus
            className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />

          {previews.length > 0 ? (
            <div
              className={`grid gap-2 ${
                previews.length >= 3
                  ? "grid-cols-3"
                  : previews.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {previews.map((p, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={p.previewUrl}
                    alt={`Preview ${i + 1}`}
                    fill
                    className="object-cover"
                  />
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

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-sm text-muted-foreground">Thêm vào bài viết</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={previews.length >= MAX_IMAGES || isPending}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              aria-label="Thêm ảnh"
            >
              <ImagePlus className="size-5 text-green-500" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {body.length > 0 ? (
            <p className={`text-right text-xs ${body.length > 4800 ? "text-red-500" : "text-muted-foreground"}`}>
              {body.length}/{MAX_BODY}
            </p>
          ) : null}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {uploading ? "Đang tải ảnh..." : "Đăng bài viết"}
          </Button>
        </DialogContent>
      </Dialog>
      <ImageEditorDialog
        file={postImageEditor.currentFile}
        queueInfo={postImageEditor.queuePosition}
        onConfirm={postImageEditor.confirm}
        onSkip={postImageEditor.skip}
        onCancel={postImageEditor.cancel}
      />
    </>
  )
}
