"use client"

import { use, useState, type ChangeEvent } from "react"
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { SiteLayout } from "@/components/layout/site-layout"
import { ErrorBoundary } from "@/components/providers/error-boundary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ImageEditorDialog } from "@/components/ui/image-editor-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useFavoriteWorkerIds,
  useToggleFavoriteWorker,
  useWorkerDetail,
} from "@/lib/hooks/use-worker"
import { useImageEditorQueue } from "@/lib/hooks/use-image-editor-queue"
import { useOpenWorkerReport, useReportWorker } from "@/lib/hooks/use-moderation"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import { useAuthStore } from "@/lib/store/auth-store"
import { uploadMultipleImages } from "@/lib/utils/upload-image"
import { toast } from "sonner"
import { WorkerAboutTabs } from "@/components/worker/worker-about-tabs"
import { WorkerCalendar } from "@/components/worker/worker-calendar"
import { WorkerInfoCards } from "@/components/worker/worker-info-cards"
import { WorkerProfileHeader } from "@/components/worker/worker-profile-header"
import { WorkerReviews } from "@/components/worker/worker-reviews"
import { WorkerAskQuestion } from "@/components/worker/worker-ask-question"
import { WorkerServices } from "@/components/worker/worker-services"
import { WorkerStatCards } from "@/components/worker/worker-stat-cards"
import { WorkerSuggestions } from "@/components/worker/worker-suggestions"
import type { ReportReason } from "@/services/moderation.service"

type PageParams = { id: string }

const reportReasonKeys: Array<{ value: ReportReason; labelKey: string }> = [
  { value: "low_quality", labelKey: "report.reasonLowQuality" },
  { value: "scam", labelKey: "report.reasonScam" },
  { value: "harassment", labelKey: "report.reasonHarassment" },
  { value: "fake_profile", labelKey: "report.reasonFakeProfile" },
  { value: "other", labelKey: "report.reasonOther" },
]

export default function WorkerProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = use(params)
  const t = useTranslations("WorkerProfile")
  const { data, isLoading, error } = useWorkerDetail(id)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { requireAuth } = useAuthRequired()
  const isOwnProfile = Boolean(currentUserId && currentUserId === id)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>("low_quality")
  const [reportDescription, setReportDescription] = useState("")
  const [reportDescriptionError, setReportDescriptionError] = useState("")
  const [reportEvidenceImages, setReportEvidenceImages] = useState<File[]>([])
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
  const evidenceEditor = useImageEditorQueue()

  const favoriteIdsQuery = useFavoriteWorkerIds()
  const toggleFavoriteMutation = useToggleFavoriteWorker()
  const reportWorkerMutation = useReportWorker()
  const openWorkerReportQuery = useOpenWorkerReport(
    id,
    isAuthenticated && !isOwnProfile
  )
  const isFavorite = favoriteIdsQuery.data?.includes(id) ?? false
  const hasOpenWorkerReport = Boolean(openWorkerReportQuery.data)
  const isReportBusy = isReportSubmitting || reportWorkerMutation.isPending

  const handleToggleFavorite = () => {
    requireAuth(() => {
      toggleFavoriteMutation.mutate(
        { workerId: id, favorite: !isFavorite },
        { onError: () => toast.error(t("favoriteError")) }
      )
    })
  }

  const handleReportWorker = async () => {
    const description = reportDescription.trim()
    if (description.length < 10) {
      setReportDescriptionError(t("report.descriptionMin"))
      return
    }

    setIsReportSubmitting(true)
    let evidenceUrls: string[] = []
    try {
      evidenceUrls =
        reportEvidenceImages.length > 0
          ? await uploadMultipleImages(reportEvidenceImages)
          : []
    } catch {
      toast.error(t("report.uploadEvidenceError"))
      setIsReportSubmitting(false)
      return
    }

    try {
      await reportWorkerMutation.mutateAsync({
        worker_id: id,
        reason: reportReason,
        description,
        evidence_urls: evidenceUrls,
      })
      setReportReason("low_quality")
      setReportDescription("")
      setReportDescriptionError("")
      setReportEvidenceImages([])
      setReportOpen(false)
    } catch {
      // Error toast is handled by useReportWorker.
    } finally {
      setIsReportSubmitting(false)
    }
  }

  const handleReportDialogOpenChange = (open: boolean) => {
    if (isReportBusy) return
    setReportOpen(open)
    if (!open) setReportDescriptionError("")
  }

  const handleReportDescriptionChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value
    setReportDescription(value)
    setReportDescriptionError(
      value.trim().length > 0 && value.trim().length < 10
        ? t("report.descriptionMin")
        : ""
    )
  }

  const handleReportEvidenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    )
    event.target.value = ""
    if (!files.length) return
    evidenceEditor.start(files, (croppedFiles) => {
      setReportEvidenceImages(croppedFiles)
    })
  }

  const removeReportEvidenceImage = (index: number) => {
    setReportEvidenceImages((files) => files.filter((_, i) => i !== index))
  }

  return (
    <SiteLayout hideFooter>
      <div className="container mx-auto px-4 py-8">
        <div
          className={
            isOwnProfile
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
          }
        >
          <div className="min-w-0">
            {isLoading ? <WorkerProfileSkeleton /> : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
                <AlertDescription>{t("loadErrorDesc")}</AlertDescription>
              </Alert>
            ) : null}

            {data ? (
              <div className="space-y-5">
                <WorkerProfileHeader
                  worker={data}
                  isOwnProfile={isOwnProfile}
                  isFavorite={isFavorite}
                  isFavoritePending={
                    toggleFavoriteMutation.isPending &&
                    toggleFavoriteMutation.variables?.workerId === id
                  }
                  onToggleFavorite={
                    isOwnProfile ? undefined : handleToggleFavorite
                  }
                  hasOpenReport={hasOpenWorkerReport}
                  onReport={
                    isOwnProfile
                      ? undefined
                      : () => requireAuth(() => setReportOpen(true))
                  }
                />

                {/* Mobile: tabbed about section directly below the intro.
                    On desktop the stats live inside the main column below. */}
                <WorkerAboutTabs profile={data.worker_profile} />

                {/* On mobile: aside (services + calendar) appears first via order-1,
                    then main content (stats + info + reviews) via order-2.
                    On lg+: compact 2-column grid — stats are grouped into the
                    main column so Services sits at the top of the side column. */}
                <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_460px] lg:gap-6">
                  {/* Main content — order-2 on mobile, first column on lg */}
                  <div className="order-2 space-y-4 lg:order-1">
                    <WorkerStatCards profile={data.worker_profile} />
                    <WorkerInfoCards profile={data.worker_profile} />
                    <WorkerReviews reviews={data.reviews ?? []} />
                    <WorkerAskQuestion
                      workerId={data.user.id}
                      isOwnProfile={isOwnProfile}
                    />
                  </div>

                  {/* Aside — order-1 on mobile (Services + Calendar shown first),
                      second column on lg */}
                  <aside className="order-1 space-y-4 lg:order-2">
                    <WorkerServices
                      workerId={data.user.id}
                      workerName={data.user.full_name ?? "worker"}
                      services={data.services ?? []}
                      workerReputationScore={
                        data.user.meta_data?.reputation_score
                      }
                    />
                    <ErrorBoundary resetKeys={[data.user.id]}>
                      <WorkerCalendar workerId={data.user.id} />
                    </ErrorBoundary>
                  </aside>
                </div>
              </div>
            ) : null}
          </div>
          {!isOwnProfile ? (
            <aside className="min-w-0">
              <ErrorBoundary resetKeys={[id]} fallback={null}>
                <WorkerSuggestions workerId={id} />
              </ErrorBoundary>
            </aside>
          ) : null}
        </div>
      </div>
      <Dialog open={reportOpen} onOpenChange={handleReportDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={reportReason}
              onValueChange={(value) => setReportReason(value as ReportReason)}
              disabled={isReportBusy}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("report.reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {reportReasonKeys.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reportDescription}
              onChange={handleReportDescriptionChange}
              placeholder={t("report.descriptionPlaceholder")}
              aria-invalid={Boolean(reportDescriptionError)}
              className={`min-h-28 ${
                reportDescriptionError
                  ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                  : ""
              }`}
            />
            {reportDescriptionError ? (
              <p className="text-sm text-destructive">
                {reportDescriptionError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm font-normal text-muted-foreground transition-colors hover:bg-muted/50">
                <ImagePlus className="size-4" />
                {t("report.addEvidence")}
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleReportEvidenceChange}
                  disabled={isReportBusy}
                />
              </Label>
              {reportEvidenceImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {reportEvidenceImages.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex max-w-full items-center gap-2 rounded-md border px-2 py-1 text-xs"
                    >
                      <span className="max-w-40 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => removeReportEvidenceImage(index)}
                        disabled={isReportBusy}
                        aria-label={t("report.removeEvidence")}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportOpen(false)}
              disabled={isReportBusy}
            >
              {t("report.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleReportWorker()}
              disabled={isReportBusy}
            >
              {isReportBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("report.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImageEditorDialog
        file={evidenceEditor.currentFile}
        queueInfo={evidenceEditor.queuePosition}
        onConfirm={evidenceEditor.confirm}
        onSkip={evidenceEditor.skip}
        onCancel={evidenceEditor.cancel}
      />
    </SiteLayout>
  )
}

function WorkerProfileSkeleton() {
  return (
    <div className="space-y-5">
      {/* Hero image skeleton */}
      <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:aspect-[3/2] lg:hidden" />
      {/* Desktop header skeleton */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,400px)_1fr] gap-6 rounded-2xl border p-5">
        <Skeleton className="aspect-[5/4] w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      {/* Mobile-only stat cards skeleton (desktop stats live in main column) */}
      <div className="flex gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-32 shrink-0 rounded-2xl" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_460px]">
        <div className="order-2 space-y-4 lg:order-1">
          <div className="hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
