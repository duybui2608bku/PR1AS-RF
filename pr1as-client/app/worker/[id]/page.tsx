"use client"

import { use, useState, type ChangeEvent } from "react"
import { AlertCircle, Flag, ImagePlus, Loader2, X } from "lucide-react"

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { useAuthStore } from "@/lib/store/auth-store"
import { uploadMultipleImages } from "@/lib/utils/upload-image"
import { toast } from "sonner"
import { WorkerCalendar } from "@/components/worker/worker-calendar"
import { WorkerInfoCards } from "@/components/worker/worker-info-cards"
import { WorkerProfileHeader } from "@/components/worker/worker-profile-header"
import { WorkerReviews } from "@/components/worker/worker-reviews"
import { WorkerServices } from "@/components/worker/worker-services"
import { WorkerStatCards } from "@/components/worker/worker-stat-cards"
import { WorkerSuggestions } from "@/components/worker/worker-suggestions"
import type { ReportReason } from "@/services/moderation.service"

type PageParams = { id: string }

const reportReasonOptions: Array<{ value: ReportReason; label: string }> = [
  { value: "low_quality", label: "Chất lượng thấp" },
  { value: "scam", label: "Lừa đảo" },
  { value: "harassment", label: "Quấy rối" },
  { value: "fake_profile", label: "Hồ sơ giả mạo" },
  { value: "other", label: "Khác" },
]

export default function WorkerProfilePage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = use(params)
  const { data, isLoading, error } = useWorkerDetail(id)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
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
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để lưu worker yêu thích.")
      return
    }
    toggleFavoriteMutation.mutate(
      { workerId: id, favorite: !isFavorite },
      { onError: () => toast.error("Không thể cập nhật danh sách yêu thích.") }
    )
  }

  const handleReportWorker = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để báo cáo worker.")
      return
    }
    const description = reportDescription.trim()
    if (description.length < 10) {
      setReportDescriptionError("Mô tả báo cáo phải có ít nhất 10 ký tự.")
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
      toast.error("Không thể tải ảnh minh chứng. Vui lòng thử lại.")
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
        ? "Mô tả báo cáo phải có ít nhất 10 ký tự."
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
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {isLoading ? <WorkerProfileSkeleton /> : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Không thể tải thông tin worker</AlertTitle>
                <AlertDescription>
                  Vui lòng thử lại sau hoặc kiểm tra đường dẫn.
                </AlertDescription>
              </Alert>
            ) : null}

            {data ? (
              <div className="space-y-6">
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
                />
                {!isOwnProfile ? (
                  <div className="flex justify-end">
                    {hasOpenWorkerReport ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                              disabled
                            >
                              <Flag className="size-4" />
                              Báo cáo worker
                            </Button>
                          </span>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="text-sm">
                          Báo cáo của bạn đang được xử lý. Bạn có thể gửi báo cáo
                          mới sau khi admin hoàn tất báo cáo hiện tại.
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReportOpen(true)}
                      >
                        <Flag className="size-4" />
                        Báo cáo worker
                      </Button>
                    )}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px]">
                  <div className="space-y-4">
                    <WorkerStatCards profile={data.worker_profile} />
                    <WorkerInfoCards profile={data.worker_profile} />
                    <WorkerReviews reviews={data.reviews ?? []} />
                  </div>
                  <aside className="space-y-4">
                    <ErrorBoundary resetKeys={[data.user.id]}>
                      <WorkerCalendar workerId={data.user.id} />
                    </ErrorBoundary>
                    <WorkerServices
                      workerId={data.user.id}
                      workerName={data.user.full_name ?? "worker"}
                      services={data.services ?? []}
                      workerReputationScore={
                        data.user.meta_data?.reputation_score
                      }
                    />
                  </aside>
                </div>
              </div>
            ) : null}
          </div>
          <aside className="min-w-0">
            <ErrorBoundary resetKeys={[id]} fallback={null}>
              <WorkerSuggestions workerId={id} />
            </ErrorBoundary>
          </aside>
        </div>
      </div>
      <Dialog open={reportOpen} onOpenChange={handleReportDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={reportReason}
              onValueChange={(value) => setReportReason(value as ReportReason)}
              disabled={isReportBusy}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn lý do báo cáo" />
              </SelectTrigger>
              <SelectContent>
                {reportReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reportDescription}
              onChange={handleReportDescriptionChange}
              placeholder="Mô tả vấn đề bạn gặp với worker..."
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
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <ImagePlus className="size-4" />
                Thêm ảnh minh chứng
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleReportEvidenceChange}
                  disabled={isReportBusy}
                />
              </label>
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
                        aria-label="Xóa ảnh minh chứng"
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
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleReportWorker()}
              disabled={isReportBusy}
            >
              {isReportBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Báo cáo
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}
