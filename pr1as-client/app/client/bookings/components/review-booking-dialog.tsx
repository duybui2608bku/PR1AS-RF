"use client"

import * as React from "react"
import { Loader2, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  REVIEW_RATING_LIMITS,
  type ReviewRatingDetails,
} from "@/types/review"

type ReviewBookingDialogProps = {
  open: boolean
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    rating: number
    rating_details: ReviewRatingDetails
    comment: string
  }) => Promise<void> | void
}

type RatingKey = keyof ReviewRatingDetails

const CATEGORIES: { key: RatingKey; label: string }[] = [
  { key: "professionalism", label: "Tính chuyên nghiệp" },
  { key: "punctuality", label: "Đúng giờ" },
  { key: "communication", label: "Giao tiếp" },
  { key: "service_quality", label: "Chất lượng dịch vụ" },
]

const DEFAULT_DETAILS: ReviewRatingDetails = {
  professionalism: 5,
  punctuality: 5,
  communication: 5,
  service_quality: 5,
}

const computeAverage = (details: ReviewRatingDetails): number => {
  const total =
    details.professionalism +
    details.punctuality +
    details.communication +
    details.service_quality
  return Math.round(total / 4)
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = React.useState(0)
  const active = hover || value

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} sao`}
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className={cn(
            "rounded-sm p-0.5 transition-colors",
            "hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              n <= active
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewBookingDialog({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: ReviewBookingDialogProps) {
  const [details, setDetails] = React.useState<ReviewRatingDetails>(DEFAULT_DETAILS)
  const [comment, setComment] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setDetails(DEFAULT_DETAILS)
      setComment("")
      setError(null)
    }
  }, [open])

  const overall = computeAverage(details)

  const handleConfirm = async () => {
    const trimmed = comment.trim()
    if (trimmed.length < REVIEW_RATING_LIMITS.MIN_COMMENT_LENGTH) {
      setError(
        `Nhận xét phải có ít nhất ${REVIEW_RATING_LIMITS.MIN_COMMENT_LENGTH} ký tự.`,
      )
      return
    }
    setError(null)
    await onSubmit({
      rating: overall,
      rating_details: details,
      comment: trimmed,
    })
  }

  const updateDetail = (key: RatingKey, value: number) => {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh giá booking</DialogTitle>
          <DialogDescription>
            Chia sẻ trải nghiệm của bạn để giúp các khách hàng khác.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 rounded-lg border p-4">
            {CATEGORIES.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-3"
              >
                <Label className="text-sm font-medium">{category.label}</Label>
                <StarRating
                  value={details[category.key]}
                  onChange={(value) => updateDetail(category.key, value)}
                  disabled={loading}
                />
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t pt-3 text-sm">
              <span className="font-medium">Đánh giá tổng</span>
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {overall}/5
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="review-comment">Nhận xét</Label>
            <Textarea
              id="review-comment"
              minLength={REVIEW_RATING_LIMITS.MIN_COMMENT_LENGTH}
              maxLength={REVIEW_RATING_LIMITS.MAX_COMMENT_LENGTH}
              rows={4}
              placeholder={`Tối thiểu ${REVIEW_RATING_LIMITS.MIN_COMMENT_LENGTH} ký tự`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/{REVIEW_RATING_LIMITS.MAX_COMMENT_LENGTH}
            </p>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Đóng
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Gửi đánh giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
