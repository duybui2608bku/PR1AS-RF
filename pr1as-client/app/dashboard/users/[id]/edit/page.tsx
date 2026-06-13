"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { isAdminUser } from "@/lib/auth/roles"
import { useAuthStore } from "@/lib/store/auth-store"
import { useGetUser, useUpdateUser } from "@/lib/hooks/use-users"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  UserCreateForm,
  buildUpdatePayload,
  draftFromUser,
  draftLabel,
  type UserDraft,
} from "@/components/dashboard/user-create-form"

export default function EditUserPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const router = useRouter()

  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = isAdminUser(currentUser)

  const userQuery = useGetUser(id)
  const updateUser = useUpdateUser()

  const [draft, setDraft] = useState<UserDraft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const editable = userQuery.data?.created_by_admin === true

  // Build the editable draft once the user detail arrives (admin-created only).
  useEffect(() => {
    if (userQuery.data && editable && !draft) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setDraft(draftFromUser(userQuery.data))
    }
  }, [userQuery.data, editable, draft])

  const patchDraft = (patch: Partial<UserDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleSave = async () => {
    if (!draft) return
    const result = buildUpdatePayload(draft)
    if ("error" in result) {
      setError(result.error)
      return
    }
    setError(null)
    try {
      await updateUser.mutateAsync({ id, payload: result.payload })
      toast.success(`Đã cập nhật "${draftLabel(draft)}".`)
      router.push("/dashboard/users")
    } catch (err) {
      setError(getErrorMessage(err, "Cập nhật người dùng thất bại."))
    }
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription>
          Chỉ quản trị viên mới có thể chỉnh sửa người dùng.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
          <Link href="/dashboard/users">
            <ArrowLeft className="size-4" />
            Quản lý người dùng
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Chỉnh sửa người dùng
        </h1>
        <p className="text-sm text-muted-foreground">
          Để trống mật khẩu nếu không muốn đổi.
        </p>
      </div>

      {userQuery.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      )}

      {userQuery.isError && (
        <Alert variant="destructive" className="rounded-2xl">
          <TriangleAlert className="size-4" />
          <AlertDescription>
            Không tải được thông tin người dùng.
          </AlertDescription>
        </Alert>
      )}

      {userQuery.data && !editable && (
        <Alert variant="destructive" className="rounded-2xl">
          <TriangleAlert className="size-4" />
          <AlertTitle>Không thể chỉnh sửa</AlertTitle>
          <AlertDescription>
            Đây là người dùng thật (không do admin tạo) nên không thể chỉnh sửa
            thông tin.
          </AlertDescription>
        </Alert>
      )}

      {draft && (
        <>
          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <TriangleAlert className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <UserCreateForm draft={draft} onPatch={patchDraft} />

          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/dashboard/users">Hủy</Link>
            </Button>
            <Button
              size="lg"
              className="rounded-xl"
              onClick={handleSave}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
