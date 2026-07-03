"use client"

import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  emptyLocalized,
  isDirty,
  LocaleSwitcher,
  LocalizedInputRow,
  LocalizedRichRow,
  SectionCard,
} from "@/components/dashboard/content-fields"
import {
  useLegalContent,
  useResetLegalContent,
  useUpdateLegalContent,
} from "@/lib/hooks/use-legal-content"
import { type SupportedLocale } from "@/lib/locale"
import {
  buildEmptyLegalContent,
  type LegalContent,
  type LegalPageKey,
  type LegalSection,
} from "@/services/legal.service"

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export function LegalEditor({ page }: { page: LegalPageKey }) {
  const { data: settings, isLoading } = useLegalContent(page)
  const updateMutation = useUpdateLegalContent(page)
  const resetMutation = useResetLegalContent(page)

  const [locale, setLocale] = useState<SupportedLocale>("vi")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [draft, setDraft] = useState<LegalContent>(buildEmptyLegalContent)
  const [rev, setRev] = useState(0)

  // Seed the draft from server data during render (React-recommended sync).
  const [syncedFrom, setSyncedFrom] = useState<LegalContent | undefined>(
    undefined
  )
  if (settings && settings !== syncedFrom) {
    setSyncedFrom(settings)
    setDraft(settings)
    setRev((r) => r + 1)
  }

  const saving = updateMutation.isPending

  if (isLoading) return <EditorSkeleton />

  // ── setters ──
  const metaDraft = {
    title: draft.title,
    lastUpdated: draft.lastUpdated,
    intro: draft.intro,
  }
  const metaDirty = settings
    ? isDirty(metaDraft, {
        title: settings.title,
        lastUpdated: settings.lastUpdated,
        intro: settings.intro,
      })
    : false
  const sectionsDirty = settings
    ? isDirty(draft.sections, settings.sections)
    : false

  const setSection = (idx: number, patch: Partial<LegalSection>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))

  const addSection = () =>
    setDraft((d) => ({
      ...d,
      sections: [
        ...d.sections,
        { title: emptyLocalized(), body: emptyLocalized() },
      ],
    }))

  const removeSection = (idx: number) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.filter((_, i) => i !== idx),
    }))

  const moveSection = (idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      const target = idx + dir
      if (target < 0 || target >= d.sections.length) return d
      const next = [...d.sections]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, sections: next }
    })

  const saveMeta = () =>
    updateMutation.mutate({
      title: draft.title,
      lastUpdated: draft.lastUpdated,
      intro: draft.intro,
    })

  const saveSections = () => {
    updateMutation.mutate({ sections: draft.sections })
    // Force editors to re-seed from the just-saved sections after reorder.
    setRev((r) => r + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Ô để trống ở một ngôn ngữ sẽ tự động hiển thị nội dung ngôn ngữ khác
            theo thứ tự ưu tiên. Thay đổi xuất hiện trên trang công khai trong
            vòng tối đa 1 phút.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setShowResetDialog(true)}
          disabled={resetMutation.isPending}
        >
          <RotateCcw className="size-4" />
          Đặt lại mặc định
        </Button>
      </div>

      <LocaleSwitcher locale={locale} onChange={setLocale} />

      {/* Page meta */}
      <SectionCard
        title="Thông tin trang"
        description="Tiêu đề, dòng cập nhật và đoạn giới thiệu (tuỳ chọn)."
        dirty={metaDirty}
        saving={saving}
        onSave={saveMeta}
      >
        <LocalizedInputRow
          label="Tiêu đề trang"
          value={draft.title}
          locale={locale}
          onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
        />
        <LocalizedInputRow
          label="Dòng cập nhật"
          hint="Ví dụ: Cập nhật lần cuối: tháng 5 năm 2026"
          value={draft.lastUpdated}
          locale={locale}
          onChange={(v) => setDraft((d) => ({ ...d, lastUpdated: v }))}
        />
        <LocalizedRichRow
          label="Đoạn giới thiệu (tuỳ chọn)"
          value={draft.intro}
          locale={locale}
          rev={rev}
          minHeight="120px"
          onChange={(v) => setDraft((d) => ({ ...d, intro: v }))}
        />
      </SectionCard>

      {/* Sections */}
      <SectionCard
        title="Các mục nội dung"
        description="Mỗi mục gồm tiêu đề và nội dung. Có thể thêm, xoá và sắp xếp lại."
        dirty={sectionsDirty}
        saving={saving}
        onSave={saveSections}
      >
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Danh sách mục ({draft.sections.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSection}
          >
            <Plus className="size-4" />
            Thêm mục
          </Button>
        </div>

        {draft.sections.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            Chưa có mục nào.
          </p>
        ) : null}

        <div className="grid gap-4">
          {draft.sections.map((section, idx) => (
            <div key={idx} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="secondary">Mục {idx + 1}</Badge>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, -1)}
                    title="Lên"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={idx === draft.sections.length - 1}
                    onClick={() => moveSection(idx, 1)}
                    title="Xuống"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeSection(idx)}
                  >
                    <Trash2 className="size-4" />
                    Xoá
                  </Button>
                </div>
              </div>
              <div className="grid gap-4">
                <LocalizedInputRow
                  label="Tiêu đề mục"
                  value={section.title}
                  locale={locale}
                  onChange={(v) => setSection(idx, { title: v })}
                />
                <LocalizedRichRow
                  label="Nội dung"
                  hint="Hỗ trợ định dạng, danh sách, liên kết."
                  value={section.body}
                  locale={locale}
                  rev={rev}
                  minHeight="180px"
                  onChange={(v) => setSection(idx, { body: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại về mặc định?</DialogTitle>
            <DialogDescription>
              Toàn bộ nội dung trang này (mọi ngôn ngữ) sẽ được khôi phục về bản
              gốc của hệ thống. Hành động này không thể hoàn tác.
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
