"use client"

import { Ban, Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useBlockedUsers, useUnblockUser } from "@/lib/hooks/use-moderation"

function getBlockedUser(blocked: unknown) {
  if (typeof blocked === "object" && blocked) {
    const user = blocked as {
      _id?: string
      id?: string
      full_name?: string | null
      email?: string | null
    }
    const id = user._id ?? user.id
    return {
      id,
      name: user.full_name || user.email || id || "Người dùng",
      email: user.email ?? "",
    }
  }
  return {
    id: String(blocked),
    name: String(blocked),
    email: "",
  }
}

export default function BlockedUsersPage() {
  const blocksQuery = useBlockedUsers()
  const unblockMutation = useUnblockUser()
  const blocks = blocksQuery.data ?? []

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách đã chặn</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý người dùng bị chặn chat, profile và bài viết.
        </p>
      </div>

      <Card className="divide-y overflow-hidden">
        {blocksQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Ban className="size-8" />
            <p>Bạn chưa chặn người dùng nào.</p>
          </div>
        ) : (
          blocks.map((block) => {
            const user = getBlockedUser(block.blocked_id)
            return (
              <div
                key={block.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {block.block_profile
                      ? "Đang chặn profile và bài viết"
                      : "Chỉ chặn chat"}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={unblockMutation.isPending || !user.id}
                    >
                      Bỏ chặn
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bỏ chặn người dùng?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn sẽ có thể nhắn tin và xem lại nội dung của{" "}
                        {user.name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:space-x-0">
                      <AlertDialogCancel className="mt-0">
                        Hủy
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={unblockMutation.isPending || !user.id}
                        onClick={() => {
                          if (!user.id) return
                          unblockMutation.mutate(user.id)
                        }}
                      >
                        Xác nhận bỏ chặn
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
