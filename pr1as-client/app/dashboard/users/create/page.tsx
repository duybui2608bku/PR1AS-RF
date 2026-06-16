"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { STORAGE_KEYS } from "@/lib/constants"
import { isAdminUser } from "@/lib/auth/roles"
import { useAuthStore } from "@/lib/store/auth-store"
import { useCreateUser } from "@/lib/hooks/use-users"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  UserCreateForm,
  buildPayload,
  buildSamplePatch,
  createEmptyDraft,
  draftLabel,
  type DraftSaveStatus,
  type UserDraft,
} from "@/components/dashboard/user-create-form"

const STORAGE_KEY = STORAGE_KEYS.adminUserDrafts

function loadDrafts(): UserDraft[] {
  if (typeof window === "undefined") return []
  try {
    // Drafts hold pending users' emails/passwords, so they live in
    // sessionStorage — cleared automatically when the tab closes.
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserDraft[]
    if (!Array.isArray(parsed) || parsed.length === 0) return []
    // Any draft caught mid-save when the tab reloaded is reset to editable.
    return parsed.map((d) =>
      d.savedStatus === "saving"
        ? { ...d, savedStatus: "draft" as DraftSaveStatus }
        : d
    )
  } catch {
    return []
  }
}

const STATUS_BADGE: Record<
  DraftSaveStatus,
  { label: string; className: string }
> = {
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  saving: { label: "Đang lưu", className: "bg-blue-100 text-blue-700" },
  saved: { label: "Đã tạo", className: "bg-emerald-100 text-emerald-700" },
  error: { label: "Lỗi", className: "bg-destructive/10 text-destructive" },
}

export default function CreateUsersPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = isAdminUser(user)

  const createUser = useCreateUser()

  const [drafts, setDrafts] = useState<UserDraft[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [hydrated, setHydrated] = useState(false)

  // Restore drafts from localStorage once on mount. Starting from empty state
  // (rather than a lazy initializer) keeps the SSR and first client render in
  // sync; the persisted drafts are loaded only after hydration.
  useEffect(() => {
    const restored = loadDrafts()
    const initial = restored.length > 0 ? restored : [createEmptyDraft()]
    /* eslint-disable react-hooks/set-state-in-effect */
    setDrafts(initial)
    setActiveId(initial[0].id)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Persist on every change (after hydration). Only unsaved drafts are kept —
  // already-created users carry sensitive data (email/password) we don't want
  // lingering in storage, and there's nothing left to recover for them.
  useEffect(() => {
    if (!hydrated) return
    const toPersist = drafts.filter((d) => d.savedStatus !== "saved")
    if (toPersist.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
  }, [drafts, hydrated])

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === activeId),
    [drafts, activeId]
  )

  const patchDraft = (id: string, patch: Partial<UserDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  const addDraft = () => {
    const draft = createEmptyDraft()
    setDrafts((prev) => [...prev, draft])
    setActiveId(draft.id)
  }

  const duplicateDraft = (id: string) => {
    const source = drafts.find((d) => d.id === id)
    if (!source) return
    const copy = createEmptyDraft()
    const cloned: UserDraft = {
      ...source,
      id: copy.id,
      email: "",
      password: "",
      savedStatus: "draft",
      errorMsg: undefined,
      createdId: undefined,
      hobbies: [...source.hobbies],
      gallery_urls: [...source.gallery_urls],
      work_locations: source.work_locations.map((w) => ({ ...w })),
      services: source.services.map((s) => ({ ...s, prices: { ...s.prices } })),
    }
    setDrafts((prev) => [...prev, cloned])
    setActiveId(cloned.id)
  }

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id)
      const finalList = next.length > 0 ? next : [createEmptyDraft()]
      if (id === activeId) setActiveId(finalList[0].id)
      return finalList
    })
  }

  const saveDraft = async (id: string): Promise<boolean> => {
    const draft = drafts.find((d) => d.id === id)
    if (!draft || draft.savedStatus === "saved") return true

    const result = buildPayload(draft)
    if ("error" in result) {
      patchDraft(id, { savedStatus: "error", errorMsg: result.error })
      return false
    }

    patchDraft(id, { savedStatus: "saving", errorMsg: undefined })
    try {
      const created = await createUser.mutateAsync(result.payload)
      patchDraft(id, { savedStatus: "saved", createdId: created?.id })
      return true
    } catch (error) {
      patchDraft(id, {
        savedStatus: "error",
        errorMsg: getErrorMessage(error, "Tạo người dùng thất bại."),
      })
      return false
    }
  }

  const saveActive = async () => {
    if (!activeDraft) return
    const ok = await saveDraft(activeDraft.id)
    if (ok) toast.success(`Đã tạo "${draftLabel(activeDraft)}".`)
  }

  const saveAll = async () => {
    const pending = drafts.filter((d) => d.savedStatus !== "saved")
    let success = 0
    for (const d of pending) {
      // Sequential so the error report and toasts stay in order.
      const ok = await saveDraft(d.id)
      if (ok) success += 1
    }
    if (success > 0)
      toast.success(`Đã tạo ${success}/${pending.length} người dùng.`)
    if (success < pending.length)
      toast.error(
        `${pending.length - success} người dùng chưa tạo được. Kiểm tra lại các tab có lỗi.`
      )
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription>
          Chỉ quản trị viên mới có thể tạo người dùng.
        </AlertDescription>
      </Alert>
    )
  }

  const pendingCount = drafts.filter((d) => d.savedStatus !== "saved").length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
            <Link href="/dashboard/users">
              <ArrowLeft className="size-4" />
              Quản lý người dùng
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Tạo người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản tạo ở đây được kích hoạt ngay, không cần xác thực email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addDraft}>
            <Plus className="size-4" />
            Thêm người dùng
          </Button>
          <Button
            onClick={saveAll}
            disabled={createUser.isPending || pendingCount === 0}
          >
            {createUser.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Lưu tất cả ({pendingCount})
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Draft list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Danh sách ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {drafts.map((d, i) => {
              const badge = STATUS_BADGE[d.savedStatus]
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveId(d.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                    d.id === activeId
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {d.savedStatus === "saved" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {draftLabel(d)}
                  </span>
                  <Badge
                    className={cn("shrink-0 text-[10px]", badge.className)}
                  >
                    {badge.label}
                  </Badge>
                </button>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={addDraft}
            >
              <Plus className="size-4" />
              Thêm
            </Button>
          </CardContent>
        </Card>

        {/* Active draft form — section cards sit directly on the background to
            match the worker-setup layout (no enclosing card). */}
        {activeDraft && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3">
              <p className="truncate text-base font-semibold">
                {draftLabel(activeDraft)}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patchDraft(activeDraft.id, buildSamplePatch(activeDraft))
                  }
                  disabled={activeDraft.savedStatus === "saved"}
                >
                  <Wand2 className="size-4" />
                  Điền mẫu
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Nhân bản"
                  onClick={() => duplicateDraft(activeDraft.id)}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Xóa"
                  onClick={() => removeDraft(activeDraft.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {activeDraft.savedStatus === "error" && activeDraft.errorMsg && (
              <Alert variant="destructive" className="rounded-2xl">
                <TriangleAlert className="size-4" />
                <AlertDescription>{activeDraft.errorMsg}</AlertDescription>
              </Alert>
            )}
            {activeDraft.savedStatus === "saved" && (
              <Alert className="rounded-2xl">
                <CheckCircle2 className="size-4" />
                <AlertDescription>
                  Đã tạo tài khoản thành công. Nhân bản để tạo người dùng tương
                  tự hoặc xóa tab này.
                </AlertDescription>
              </Alert>
            )}

            <UserCreateForm
              draft={activeDraft}
              onPatch={(patch) => patchDraft(activeDraft.id, patch)}
            />

            <div className="flex justify-end gap-2">
              <Button
                size="lg"
                className="rounded-xl"
                onClick={saveActive}
                disabled={
                  activeDraft.savedStatus === "saving" ||
                  activeDraft.savedStatus === "saved"
                }
              >
                {activeDraft.savedStatus === "saving" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Lưu người dùng này
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
