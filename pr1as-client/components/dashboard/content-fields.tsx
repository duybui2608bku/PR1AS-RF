"use client"

import { Languages, Loader2, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TipTapEditor } from "@/components/ui/tiptap-editor"
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale"

// ─── Types & helpers ─────────────────────────────────────────────────────────

export type LocalizedText = { vi: string; en: string; zh: string; ko: string }

export const emptyLocalized = (): LocalizedText => ({
  vi: "",
  en: "",
  zh: "",
  ko: "",
})

export function isDirty<T>(a: T, b: T): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

/** True when the HTML has no visible text (ignoring tags/whitespace). */
export function isBlankHtml(html: string): boolean {
  return !html.replace(/<[^>]*>/g, "").trim()
}

function MissingBadge({ locale }: { locale: SupportedLocale }) {
  return (
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
      • thiếu nội dung {LOCALE_LABELS[locale]}
    </span>
  )
}

// ─── Language switcher ───────────────────────────────────────────────────────

export function LocaleSwitcher({
  locale,
  onChange,
}: {
  locale: SupportedLocale
  onChange: (locale: SupportedLocale) => void
}) {
  return (
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
            onClick={() => onChange(l)}
          >
            {LOCALE_LABELS[l]}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Localized single-line input ─────────────────────────────────────────────

export function LocalizedInputRow({
  label,
  hint,
  value,
  locale,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: LocalizedText
  locale: SupportedLocale
  onChange: (next: LocalizedText) => void
  placeholder?: string
}) {
  const missing = !(value[locale] ?? "").trim()
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {missing ? <MissingBadge locale={locale} /> : null}
      </div>
      <Input
        value={value[locale] ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// ─── Localized multi-line textarea ───────────────────────────────────────────

export function LocalizedTextareaRow({
  label,
  hint,
  value,
  locale,
  onChange,
  placeholder,
  rows,
}: {
  label: string
  hint?: string
  value: LocalizedText
  locale: SupportedLocale
  onChange: (next: LocalizedText) => void
  placeholder?: string
  rows?: number
}) {
  const missing = !(value[locale] ?? "").trim()
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        {missing ? <MissingBadge locale={locale} /> : null}
      </div>
      <Textarea
        value={value[locale] ?? ""}
        placeholder={placeholder}
        rows={rows ?? 3}
        onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// ─── Localized rich-text (TipTap) ────────────────────────────────────────────

export function LocalizedRichRow({
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
  /** Bumped by the parent to force the editor to remount and re-seed content. */
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
        {missing ? <MissingBadge locale={locale} /> : null}
      </div>
      <TipTapEditor
        key={`${locale}-${rev}`}
        value={value[locale] ?? ""}
        minHeight={minHeight ?? "160px"}
        placeholder={placeholder}
        onChange={(html) => onChange({ ...value, [locale]: html })}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// ─── Non-localized plain input ───────────────────────────────────────────────

export function PlainInputRow({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string
  hint?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type ?? "text"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// ─── Card shell with save button ─────────────────────────────────────────────

export function SectionCard({
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
