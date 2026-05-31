"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  AtSign,
  ExternalLink,
  GitBranch,
  Globe,
  ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  useSiteSettings,
  useUpdateSiteSettings,
  useResetSiteSettings,
} from "@/lib/hooks/use-site-settings"
import type { SiteSettings } from "@/services/site-settings.service"

// ─── Types ────────────────────────────────────────────────────────────────────

type IdentityDraft = Pick<
  SiteSettings,
  "name" | "shortName" | "description" | "logoUrl" | "faviconUrl"
>

type SeoDraft = Pick<
  SiteSettings,
  "siteUrl" | "contactEmail" | "ogImageUrl" | "keywords" | "twitterHandle"
>

type SocialDraft = Pick<SiteSettings, "facebook" | "twitter" | "zalo" | "github">

type SocialKey = keyof SocialDraft

interface SocialLinkConfig {
  key: SocialKey
  label: string
  Icon: React.ComponentType<{ className?: string }>
  placeholder: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOCIAL_LINKS: SocialLinkConfig[] = [
  {
    key: "facebook",
    label: "Facebook",
    Icon: Share2,
    placeholder: "https://facebook.com/pr1as",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    Icon: Send,
    placeholder: "https://twitter.com/pr1as",
  },
  {
    key: "zalo",
    label: "Zalo OA",
    Icon: MessageCircle,
    placeholder: "https://zalo.me/0909090909",
  },
  {
    key: "github",
    label: "GitHub",
    Icon: GitBranch,
    placeholder: "https://github.com/pr1as",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDirty<T>(draft: T, saved: T): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved)
}

function toIdentityDraft(s: SiteSettings): IdentityDraft {
  return {
    name: s.name,
    shortName: s.shortName,
    description: s.description,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
  }
}

function toSeoDraft(s: SiteSettings): SeoDraft {
  return {
    siteUrl: s.siteUrl,
    contactEmail: s.contactEmail,
    ogImageUrl: s.ogImageUrl,
    keywords: s.keywords,
    twitterHandle: s.twitterHandle,
  }
}

function toSocialDraft(s: SiteSettings): SocialDraft {
  return {
    facebook: s.facebook,
    twitter: s.twitter,
    zalo: s.zalo,
    github: s.github,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [url])

  if (!url) return null

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
        {broken ? (
          <ImageIcon className="size-5 text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            className="size-full rounded-lg object-contain p-1"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Xem ảnh <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function UnsavedBadge({ dirty }: { dirty: boolean }) {
  if (!dirty) return null
  return (
    <Badge
      variant="outline"
      className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
    >
      Chưa lưu
    </Badge>
  )
}

function SaveBar({
  dirty,
  saving,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
}) {
  return (
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
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useSiteSettings()
  const updateMutation = useUpdateSiteSettings()
  const resetMutation = useResetSiteSettings()

  const [showResetDialog, setShowResetDialog] = useState(false)

  const [identityDraft, setIdentityDraft] = useState<IdentityDraft>({
    name: "",
    shortName: "",
    description: "",
    logoUrl: "",
    faviconUrl: "",
  })
  const [seoDraft, setSeoDraft] = useState<SeoDraft>({
    siteUrl: "",
    contactEmail: "",
    ogImageUrl: "",
    keywords: "",
    twitterHandle: "",
  })
  const [socialDraft, setSocialDraft] = useState<SocialDraft>({
    facebook: "",
    twitter: "",
    zalo: "",
    github: "",
  })

  useEffect(() => {
    if (!settings) return
    setIdentityDraft(toIdentityDraft(settings))
    setSeoDraft(toSeoDraft(settings))
    setSocialDraft(toSocialDraft(settings))
  }, [settings])

  const identityDirty = settings
    ? isDirty(identityDraft, toIdentityDraft(settings))
    : false
  const seoDirty = settings ? isDirty(seoDraft, toSeoDraft(settings)) : false
  const socialDirty = settings
    ? isDirty(socialDraft, toSocialDraft(settings))
    : false

  const isSaving = updateMutation.isPending

  function handleReset() {
    resetMutation.mutate(undefined, {
      onSettled: () => setShowResetDialog(false),
    })
  }

  if (isLoading) return <SettingsSkeleton />

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Settings className="size-6" />
              Cài đặt hệ thống
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cấu hình danh tính thương hiệu, SEO và liên kết mạng xã hội.
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
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Thay đổi SEO, tên trang và favicon chỉ có hiệu lực sau khi cập
            nhật biến môi trường và re-deploy. Cài đặt này lưu tham chiếu để
            dễ quản lý tập trung.
          </span>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="identity">
          <TabsList>
            <TabsTrigger value="identity">Danh tính</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="social">Liên kết</TabsTrigger>
          </TabsList>

          {/* ── Tab: Danh tính ── */}
          <TabsContent value="identity" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="border-b bg-muted/30 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Thông tin thương hiệu</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Tên, logo và favicon hiển thị trên toàn bộ giao diện và trình duyệt.
                    </CardDescription>
                  </div>
                  <UnsavedBadge dirty={identityDirty} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow
                    label="Tên đầy đủ"
                    hint="Hiển thị trên tab trình duyệt và tiêu đề trang."
                  >
                    <Input
                      value={identityDraft.name}
                      maxLength={80}
                      onChange={(e) =>
                        setIdentityDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </FieldRow>
                  <FieldRow
                    label="Tên ngắn"
                    hint="Dùng trong manifest PWA, tối đa 20 ký tự."
                  >
                    <Input
                      value={identityDraft.shortName}
                      maxLength={20}
                      onChange={(e) =>
                        setIdentityDraft((d) => ({
                          ...d,
                          shortName: e.target.value,
                        }))
                      }
                    />
                  </FieldRow>
                </div>

                <FieldRow
                  label="Mô tả trang"
                  hint="Hiển thị trong kết quả tìm kiếm (meta description), khuyến nghị 120–160 ký tự."
                >
                  <Textarea
                    value={identityDraft.description}
                    maxLength={300}
                    rows={3}
                    onChange={(e) =>
                      setIdentityDraft((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {identityDraft.description.length} / 300
                  </p>
                </FieldRow>

                <Separator />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow
                    label="URL Logo"
                    hint="Ảnh logo chính (PNG/SVG, nền trong suốt). Dùng cho header và email."
                  >
                    <div className="relative">
                      <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="https://example.com/logo.svg"
                        value={identityDraft.logoUrl}
                        onChange={(e) =>
                          setIdentityDraft((d) => ({
                            ...d,
                            logoUrl: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <ImagePreview url={identityDraft.logoUrl} alt="Logo" />
                  </FieldRow>

                  <FieldRow
                    label="URL Favicon"
                    hint="Ảnh favicon hiển thị trên tab trình duyệt (.ico hoặc .png 32×32)."
                  >
                    <div className="relative">
                      <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="https://example.com/favicon.png"
                        value={identityDraft.faviconUrl}
                        onChange={(e) =>
                          setIdentityDraft((d) => ({
                            ...d,
                            faviconUrl: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <ImagePreview url={identityDraft.faviconUrl} alt="Favicon" />
                  </FieldRow>
                </div>
              </CardContent>
            </Card>

            <SaveBar
              dirty={identityDirty}
              saving={isSaving}
              onSave={() => updateMutation.mutate(identityDraft)}
            />
          </TabsContent>

          {/* ── Tab: SEO ── */}
          <TabsContent value="seo" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="border-b bg-muted/30 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Search className="size-4 text-muted-foreground" />
                      Tối ưu công cụ tìm kiếm
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Thông tin meta cho Google, Bing, Facebook Open Graph và Twitter Card.
                    </CardDescription>
                  </div>
                  <UnsavedBadge dirty={seoDirty} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FieldRow
                    label="URL trang web"
                    hint="URL gốc, dùng làm canonical và metadataBase của Next.js."
                  >
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="url"
                        placeholder="https://pr1as.com"
                        value={seoDraft.siteUrl}
                        onChange={(e) =>
                          setSeoDraft((d) => ({
                            ...d,
                            siteUrl: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="Email liên hệ"
                    hint="Dùng trong metadata, trang liên hệ và email hệ thống."
                  >
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="email"
                        placeholder="contact@pr1as.com"
                        value={seoDraft.contactEmail}
                        onChange={(e) =>
                          setSeoDraft((d) => ({
                            ...d,
                            contactEmail: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </FieldRow>
                </div>

                <FieldRow
                  label="URL ảnh Open Graph"
                  hint="Ảnh hiển thị khi chia sẻ link lên Facebook, Zalo, Twitter (tối thiểu 1200×630 px)."
                >
                  <div className="relative">
                    <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="https://example.com/og-image.jpg"
                      value={seoDraft.ogImageUrl}
                      onChange={(e) =>
                        setSeoDraft((d) => ({
                          ...d,
                          ogImageUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <ImagePreview url={seoDraft.ogImageUrl} alt="OG Image" />
                </FieldRow>

                <FieldRow
                  label="Từ khóa (Keywords)"
                  hint="Phân cách bằng dấu phẩy. Dùng cho thẻ meta keywords."
                >
                  <Textarea
                    placeholder="PR1AS, booking dịch vụ, freelancer Việt Nam"
                    value={seoDraft.keywords}
                    rows={3}
                    onChange={(e) =>
                      setSeoDraft((d) => ({
                        ...d,
                        keywords: e.target.value,
                      }))
                    }
                  />
                </FieldRow>

                <FieldRow
                  label="Twitter / X Handle"
                  hint="Tên tài khoản không cần @. Dùng cho thẻ twitter:site trong Twitter Card."
                >
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="pr1as"
                      value={seoDraft.twitterHandle}
                      onChange={(e) =>
                        setSeoDraft((d) => ({
                          ...d,
                          twitterHandle: e.target.value,
                        }))
                      }
                    />
                  </div>
                </FieldRow>
              </CardContent>
            </Card>

            <SaveBar
              dirty={seoDirty}
              saving={isSaving}
              onSave={() => updateMutation.mutate(seoDraft)}
            />
          </TabsContent>

          {/* ── Tab: Liên kết ── */}
          <TabsContent value="social" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="border-b bg-muted/30 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Liên kết mạng xã hội</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Hiển thị trong footer, trang giới thiệu và email thông báo.
                    </CardDescription>
                  </div>
                  <UnsavedBadge dirty={socialDirty} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5">
                {SOCIAL_LINKS.map(({ key, label, Icon, placeholder }) => (
                  <FieldRow key={key} label={label}>
                    <div className="relative">
                      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="url"
                        placeholder={placeholder}
                        value={socialDraft[key]}
                        onChange={(e) =>
                          setSocialDraft((d) => ({
                            ...d,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </FieldRow>
                ))}
              </CardContent>
            </Card>

            <SaveBar
              dirty={socialDirty}
              saving={isSaving}
              onSave={() => updateMutation.mutate(socialDraft)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại về mặc định?</DialogTitle>
            <DialogDescription>
              Toàn bộ cài đặt tùy chỉnh sẽ bị xóa và khôi phục về giá trị gốc
              từ cấu hình hệ thống. Hành động này không thể hoàn tác.
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
              onClick={handleReset}
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
