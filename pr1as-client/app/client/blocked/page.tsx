"use client"

import { Ban, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useBlockedUsers, useUnblockUser } from "@/lib/hooks/use-moderation"

function getBlockedUser(blocked: unknown) {
  if (typeof blocked === "object" && blocked && "_id" in blocked) {
    const user = blocked as {
      _id: string
      full_name?: string | null
      email?: string | null
    }
    return {
      id: user._id,
      name: user.full_name || user.email || user._id,
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
        <h1 className="text-2xl font-bold tracking-tight">Danh sach da chan</h1>
        <p className="text-sm text-muted-foreground">
          Quan ly nguoi dung bi chan chat, profile va bai viet.
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
            <p>Ban chua chan nguoi dung nao.</p>
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
                      ? "Dang an profile va bai viet"
                      : "Chi chan chat"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unblockMutation.isPending}
                  onClick={() => unblockMutation.mutate(user.id)}
                >
                  Bo chan
                </Button>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
