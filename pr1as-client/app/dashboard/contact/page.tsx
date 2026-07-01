"use client"

import { useState } from "react"
import { Contact as ContactIcon, Info, Loader2, RotateCcw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  isDirty,
  LocaleSwitcher,
  LocalizedInputRow,
  LocalizedRichRow,
  LocalizedTextareaRow,
  PlainInputRow,
  SectionCard,
} from "@/components/dashboard/content-fields"
import {
  useContactContent,
  useResetContactContent,
  useUpdateContactContent,
} from "@/lib/hooks/use-contact-content"
import { type SupportedLocale } from "@/lib/locale"
import {
  buildEmptyContactContent,
  type ContactContent,
} from "@/services/contact.service"

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export default function AdminContactPage() {
  const { data: settings, isLoading } = useContactContent()
  const updateMutation = useUpdateContactContent()
  const resetMutation = useResetContactContent()

  const [locale, setLocale] = useState<SupportedLocale>("vi")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [draft, setDraft] = useState<ContactContent>(buildEmptyContactContent)
  const [rev, setRev] = useState(0)

  const [syncedFrom, setSyncedFrom] = useState<ContactContent | undefined>(
    undefined
  )
  if (settings && settings !== syncedFrom) {
    setSyncedFrom(settings)
    setDraft(settings)
    setRev((r) => r + 1)
  }

  const saving = updateMutation.isPending

  if (isLoading) return <PageSkeleton />

  const introDirty = settings
    ? isDirty(
        { title: draft.title, subtitle: draft.subtitle, body: draft.body },
        {
          title: settings.title,
          subtitle: settings.subtitle,
          body: settings.body,
        }
      )
    : false
  const detailsDirty = settings
    ? isDirty(
        {
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          hours: draft.hours,
        },
        {
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          hours: settings.hours,
        }
      )
    : false

  const saveIntro = () =>
    updateMutation.mutate({
      title: draft.title,
      subtitle: draft.subtitle,
      body: draft.body,
    })
  const saveDetails = () =>
    updateMutation.mutate({
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
      hours: draft.hours,
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ContactIcon className="size-6" />
            Trang liên hệ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chỉnh sửa nội dung và thông tin liên hệ hiển thị trên trang “Liên
            hệ” cho từng ngôn ngữ.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResetDialog(true)}
          disabled={resetMutation.isPending}
        >
          <RotateCcw className="size-4" />
          Đặt lại mặc định
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Email và số điện thoại dùng chung cho mọi ngôn ngữ. Các trường còn lại
          để trống ở một ngôn ngữ sẽ tự hiển thị ngôn ngữ khác theo thứ tự ưu
          tiên.
        </span>
      </div>

      <LocaleSwitcher locale={locale} onChange={setLocale} />

      <SectionCard
        title="Giới thiệu"
        description="Tiêu đề, mô tả ngắn và đoạn nội dung của trang liên hệ."
        dirty={introDirty}
        saving={saving}
        onSave={saveIntro}
      >
        <LocalizedInputRow
          label="Tiêu đề"
          value={draft.title}
          locale={locale}
          onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
        />
        <LocalizedTextareaRow
          label="Mô tả ngắn"
          value={draft.subtitle}
          locale={locale}
          onChange={(v) => setDraft((d) => ({ ...d, subtitle: v }))}
        />
        <LocalizedRichRow
          label="Nội dung"
          hint="Đoạn mô tả thêm — hỗ trợ định dạng, danh sách, liên kết."
          value={draft.body}
          locale={locale}
          rev={rev}
          minHeight="160px"
          onChange={(v) => setDraft((d) => ({ ...d, body: v }))}
        />
      </SectionCard>

      <SectionCard
        title="Thông tin liên hệ"
        description="Kênh liên hệ hiển thị dưới dạng thẻ trên trang."
        dirty={detailsDirty}
        saving={saving}
        onSave={saveDetails}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <PlainInputRow
            label="Email"
            type="email"
            value={draft.email}
            placeholder="pr1as.connect@gmail.com"
            onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
          />
          <PlainInputRow
            label="Số điện thoại"
            value={draft.phone}
            placeholder="+84 ..."
            onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
          />
        </div>
        <LocalizedTextareaRow
          label="Địa chỉ"
          value={draft.address}
          locale={locale}
          rows={2}
          onChange={(v) => setDraft((d) => ({ ...d, address: v }))}
        />
        <LocalizedInputRow
          label="Giờ làm việc"
          value={draft.hours}
          locale={locale}
          onChange={(v) => setDraft((d) => ({ ...d, hours: v }))}
        />
      </SectionCard>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại về mặc định?</DialogTitle>
            <DialogDescription>
              Toàn bộ nội dung trang liên hệ (mọi ngôn ngữ) sẽ được khôi phục về
              bản gốc của hệ thống. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={resetMutation.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                resetMutation.mutate(undefined, {
                  onSettled: () => setShowResetDialog(false),
                })
              }
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Đặt lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
