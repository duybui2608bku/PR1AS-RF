"use client"

import { useState } from "react"
import {
  Info,
  Languages,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TipTapEditor } from "@/components/ui/tiptap-editor"
import {
  useAboutContent,
  useResetAboutContent,
  useUpdateAboutContent,
} from "@/lib/hooks/use-about-content"
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale"
import {
  buildEmptyAboutContent,
  type AboutContent,
  type AboutContentPatch,
  type LocalizedText,
} from "@/services/about.service"

// ─── Types & helpers ───────────────────────────────────────────────────────────

type SectionKey = keyof AboutContent
type ItemsSection = "why" | "features"

const emptyLocalized = (): LocalizedText => ({ vi: "", en: "", zh: "", ko: "" })

function isDirty<T>(a: T, b: T): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

/** True when the HTML has no visible text (ignoring tags/whitespace). */
function isBlankHtml(html: string): boolean {
  return !html.replace(/<[^>]*>/g, "").trim()
}

// ─── Field components ───────────────────────────────────────────────────────────

function LocalizedRichField({
  value,
  locale,
  rev,
  onChange,
  minHeight,
  placeholder,
}: {
  value: LocalizedText
  locale: SupportedLocale
  rev: number
  onChange: (next: LocalizedText) => void
  minHeight?: string
  placeholder?: string
}) {
  return (
    <TipTapEditor
      // Remount on locale switch / external sync so the editor re-seeds content.
      key={`${locale}-${rev}`}
      value={value[locale] ?? ""}
      minHeight={minHeight ?? "72px"}
      placeholder={placeholder}
      onChange={(html) => onChange({ ...value, [locale]: html })}
    />
  )
}

function RichRow({
  label,
  hint,
  value,
  locale,
  rev,
  onChange,
  minHeight,
  placeholder,
}: {
  label: string
  hint?: string
  value: LocalizedText
  locale: SupportedLocale
  rev: number
  onChange: (next: LocalizedText) => void
  minHeight?: string
  placeholder?: string
}) {
  const missing = isBlankHtml(value[locale] ?? "")
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {missing ? (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            • thiếu nội dung {LOCALE_LABELS[locale]}
          </span>
        ) : null}
      </div>
      <LocalizedRichField
        value={value}
        locale={locale}
        rev={rev}
        onChange={onChange}
        minHeight={minHeight}
        placeholder={placeholder}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function SectionShell({
  title,
  description,
  dirty,
  saving,
  onSave,
  children,
}: {
  title: string
  description?: string
  dirty: boolean
  saving: boolean
  onSave: () => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              {description ? (
                <CardDescription className="mt-0.5 text-xs">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {dirty ? (
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
              >
                Chưa lưu
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5">{children}</CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAboutPage() {
  const { data: settings, isLoading } = useAboutContent()
  const updateMutation = useUpdateAboutContent()
  const resetMutation = useResetAboutContent()

  const [locale, setLocale] = useState<SupportedLocale>("vi")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [draft, setDraft] = useState<AboutContent>(buildEmptyAboutContent)
  // Bumped whenever we resync the draft from the server, forcing editors to
  // remount and pick up the fresh content.
  const [rev, setRev] = useState(0)

  // Seed the draft from server data during render (React-recommended sync — no
  // effect). Re-runs whenever a new content object arrives (load / save / reset).
  const [syncedFrom, setSyncedFrom] = useState<AboutContent | undefined>(
    undefined
  )
  if (settings && settings !== syncedFrom) {
    setSyncedFrom(settings)
    setDraft(settings)
    setRev((r) => r + 1)
  }

  const saving = updateMutation.isPending

  // ── immutable setters ──
  const patchSection = <K extends SectionKey>(
    section: K,
    patch: Partial<AboutContent[K]>
  ) =>
    setDraft(
      (d) => ({ ...d, [section]: { ...d[section], ...patch } }) as AboutContent
    )

  const setItem = (
    section: ItemsSection,
    idx: number,
    key: "title" | "description",
    val: LocalizedText
  ) =>
    setDraft(
      (d) =>
        ({
          ...d,
          [section]: {
            ...d[section],
            items: d[section].items.map((it, i) =>
              i === idx ? { ...it, [key]: val } : it
            ),
          },
        }) as AboutContent
    )

  const addItem = (section: ItemsSection) =>
    setDraft(
      (d) =>
        ({
          ...d,
          [section]: {
            ...d[section],
            items: [
              ...d[section].items,
              { title: emptyLocalized(), description: emptyLocalized() },
            ],
          },
        }) as AboutContent
    )

  const removeItem = (section: ItemsSection, idx: number) =>
    setDraft(
      (d) =>
        ({
          ...d,
          [section]: {
            ...d[section],
            items: d[section].items.filter((_, i) => i !== idx),
          },
        }) as AboutContent
    )

  const saveSection = (section: SectionKey) =>
    updateMutation.mutate({ [section]: draft[section] } as AboutContentPatch)

  const dirty = (section: SectionKey): boolean =>
    settings ? isDirty(draft[section], settings[section]) : false

  if (isLoading) return <PageSkeleton />

  const itemsTab = (section: ItemsSection, itemLabel: string) => (
    <SectionShell
      title="Tiêu đề khối"
      description="Tiêu đề và mô tả ngắn hiển thị phía trên danh sách."
      dirty={dirty(section)}
      saving={saving}
      onSave={() => saveSection(section)}
    >
      <RichRow
        label="Tiêu đề"
        value={draft[section].title}
        locale={locale}
        rev={rev}
        onChange={(v) => patchSection(section, { title: v })}
      />
      <RichRow
        label="Mô tả ngắn"
        value={draft[section].subtitle}
        locale={locale}
        rev={rev}
        onChange={(v) => patchSection(section, { subtitle: v })}
      />

      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Danh sách {itemLabel}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem(section)}
        >
          <Plus className="size-4" />
          Thêm mục
        </Button>
      </div>

      {draft[section].items.length === 0 ? (
        <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          Chưa có mục nào. Trang sẽ dùng nội dung mặc định.
        </p>
      ) : null}

      <div className="grid gap-4">
        {draft[section].items.map((item, idx) => (
          <div key={idx} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <Badge variant="secondary">Mục {idx + 1}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeItem(section, idx)}
              >
                <Trash2 className="size-4" />
                Xoá
              </Button>
            </div>
            <div className="grid gap-4">
              <RichRow
                label="Tiêu đề mục"
                value={item.title}
                locale={locale}
                rev={rev}
                onChange={(v) => setItem(section, idx, "title", v)}
              />
              <RichRow
                label="Mô tả mục"
                value={item.description}
                locale={locale}
                rev={rev}
                onChange={(v) => setItem(section, idx, "description", v)}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Info className="size-6" />
              Trang giới thiệu
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chỉnh sửa nội dung trang “Giới thiệu” cho từng ngôn ngữ. Bố cục,
              biểu tượng và màu sắc được cố định — bạn chỉ thay đổi chữ.
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

        {/* Info banner */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Ô để trống ở một ngôn ngữ sẽ tự động hiển thị nội dung mặc định theo
            thứ tự ưu tiên ngôn ngữ. Thay đổi xuất hiện trên trang công khai
            trong vòng tối đa 1 phút.
          </span>
        </div>

        {/* Global language switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Languages className="size-4" />
            Ngôn ngữ đang sửa:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_LOCALES.map((l) => (
              <Button
                key={l}
                type="button"
                size="sm"
                variant={locale === l ? "default" : "outline"}
                onClick={() => setLocale(l)}
              >
                {LOCALE_LABELS[l]}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="hero">
          <TabsList>
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="what">Giới thiệu</TabsTrigger>
            <TabsTrigger value="why">Vì sao chọn</TabsTrigger>
            <TabsTrigger value="features">Tính năng</TabsTrigger>
            <TabsTrigger value="cta">Kêu gọi (CTA)</TabsTrigger>
          </TabsList>

          {/* ── Hero ── */}
          <TabsContent value="hero" className="mt-4">
            <SectionShell
              title="Khu vực Hero"
              description="Phần đầu trang: nhãn, tiêu đề lớn và mô tả."
              dirty={dirty("hero")}
              saving={saving}
              onSave={() => saveSection("hero")}
            >
              <RichRow
                label="Nhãn (badge)"
                value={draft.hero.badge}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("hero", { badge: v })}
              />
              <RichRow
                label="Tiêu đề chính"
                value={draft.hero.title}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("hero", { title: v })}
              />
              <RichRow
                label="Mô tả phụ"
                value={draft.hero.subtitle}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("hero", { subtitle: v })}
              />
            </SectionShell>
          </TabsContent>

          {/* ── What ── */}
          <TabsContent value="what" className="mt-4">
            <SectionShell
              title="Khối “PR1AS là gì”"
              description="Tiêu đề, dòng tagline và đoạn nội dung giới thiệu."
              dirty={dirty("what")}
              saving={saving}
              onSave={() => saveSection("what")}
            >
              <RichRow
                label="Tiêu đề"
                value={draft.what.title}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("what", { title: v })}
              />
              <RichRow
                label="Tagline (dòng nhỏ cạnh logo)"
                value={draft.what.tagline}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("what", { tagline: v })}
              />
              <RichRow
                label="Nội dung"
                hint="Đoạn văn giới thiệu — hỗ trợ định dạng, danh sách, liên kết."
                minHeight="200px"
                value={draft.what.body}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("what", { body: v })}
              />
            </SectionShell>
          </TabsContent>

          {/* ── Why ── */}
          <TabsContent value="why" className="mt-4">
            {itemsTab("why", "lý do")}
          </TabsContent>

          {/* ── Features ── */}
          <TabsContent value="features" className="mt-4">
            {itemsTab("features", "tính năng")}
          </TabsContent>

          {/* ── CTA ── */}
          <TabsContent value="cta" className="mt-4">
            <SectionShell
              title="Khối kêu gọi hành động"
              description="Tiêu đề, mô tả và nhãn hai nút ở cuối trang."
              dirty={dirty("cta")}
              saving={saving}
              onSave={() => saveSection("cta")}
            >
              <RichRow
                label="Tiêu đề"
                value={draft.cta.title}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("cta", { title: v })}
              />
              <RichRow
                label="Mô tả"
                value={draft.cta.subtitle}
                locale={locale}
                rev={rev}
                onChange={(v) => patchSection("cta", { subtitle: v })}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <RichRow
                  label="Nút chính"
                  value={draft.cta.primary}
                  locale={locale}
                  rev={rev}
                  onChange={(v) => patchSection("cta", { primary: v })}
                />
                <RichRow
                  label="Nút phụ"
                  value={draft.cta.secondary}
                  locale={locale}
                  rev={rev}
                  onChange={(v) => patchSection("cta", { secondary: v })}
                />
              </div>
            </SectionShell>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại về mặc định?</DialogTitle>
            <DialogDescription>
              Toàn bộ nội dung trang giới thiệu (mọi ngôn ngữ) sẽ được khôi phục
              về bản gốc của hệ thống. Hành động này không thể hoàn tác.
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
    </>
  )
}
