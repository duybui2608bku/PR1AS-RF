"use client"

import { useState } from "react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { Globe, Lock, MoreHorizontal, Pencil, Trash2, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDeletePost } from "@/lib/hooks/use-posts"
import { useAuthStore } from "@/lib/store/auth-store"
import type { PostPublic } from "@/types"
import { EditPostDialog } from "./edit-post-dialog"

type Props = {
  post: PostPublic
}

function AuthorAvatar({ avatar, name }: { avatar: string | null; name: string | null }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
      <User className="size-5 text-muted-foreground" />
    </div>
  )
}

function PostBodyWithHashtags({ body }: { body: string }) {
  const parts = body.split(/(#[\p{L}\p{N}_]{1,50})/gu)
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="font-medium text-primary cursor-pointer hover:underline">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  )
}

function PostMedia({ media }: { media: PostPublic["media"] }) {
  if (media.length === 0) return null

  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order)

  if (sorted.length === 1) {
    const item = sorted[0]
    if (item.type === "video") {
      return (
        <div className="overflow-hidden rounded-lg border">
          <video src={item.url} controls className="max-h-96 w-full object-contain" />
        </div>
      )
    }
    return (
      <div className="overflow-hidden rounded-lg border">
        <Image
          src={item.url}
          alt="Post image"
          width={800}
          height={600}
          className="max-h-96 w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`grid gap-1 ${sorted.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {sorted.map((item) =>
        item.type === "video" ? (
          <video
            key={item.id}
            src={item.url}
            controls
            className="aspect-square w-full rounded object-cover"
          />
        ) : (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded">
            <Image src={item.url} alt="Post image" fill className="object-cover" />
          </div>
        ),
      )}
    </div>
  )
}

export function PostCard({ post }: Props) {
  const { user } = useAuthStore()
  const deleteMutation = useDeletePost()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const isOwner = user?.id === post.author.id
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: vi,
  })

  const handleDelete = () => {
    setMenuOpen(false)
    if (confirm("Bạn có chắc muốn xóa bài viết này?")) {
      deleteMutation.mutate(post.id)
    }
  }

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <AuthorAvatar avatar={post.author.avatar} name={post.author.full_name} />
          <div>
            <p className="text-sm font-semibold leading-tight">
              {post.author.full_name ?? "Người dùng"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              <span>·</span>
              {post.visibility === "public" ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
            </div>
          </div>
        </div>

        {isOwner ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="size-4" />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-9 z-10 min-w-[140px] rounded-lg border bg-background shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => { setMenuOpen(false); setEditOpen(true) }}
                >
                  <Pencil className="size-3.5" />
                  Chỉnh sửa
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-3.5" />
                  Xóa bài
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="mb-3">
        <PostBodyWithHashtags body={post.body} />
      </div>

      {/* Media */}
      {post.media.length > 0 ? (
        <div className="mb-3">
          <PostMedia media={post.media} />
        </div>
      ) : null}

      {/* Hashtags */}
      {post.hashtags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Badge key={tag.slug} variant="secondary" className="cursor-pointer text-xs">
              #{tag.display}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Click outside to close menu */}
      {menuOpen ? (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpen(false)} />
      ) : null}

      {editOpen ? (
        <EditPostDialog post={post} onClose={() => setEditOpen(false)} />
      ) : null}
    </article>
  )
}
