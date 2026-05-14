import { Star, User as UserIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getPlanRingClass } from "@/lib/utils/plan"
import type { WorkerReviewItem } from "@/types"

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const ReviewItem = ({ review }: { review: WorkerReviewItem }) => {
  const initial =
    (review.client.full_name ?? "?").trim().charAt(0).toUpperCase() || "?"
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Avatar className={cn("size-9", getPlanRingClass(review.client.meta_data?.pricing_plan_code))}>
        {review.client.avatar ? (
          <AvatarImage
            src={review.client.avatar}
            alt={review.client.full_name ?? "client"}
          />
        ) : null}
        <AvatarFallback>
          {initial === "?" ? <UserIcon className="size-4" /> : initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            {review.client.full_name ?? "Khách hàng"}
          </p>
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  i < review.rating
                    ? "size-3.5 fill-amber-400 text-amber-400"
                    : "size-3.5 text-muted-foreground/40"
                }
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDate(review.created_at)}
          </span>
        </div>
        <p className="mt-1.5 text-sm whitespace-pre-line text-foreground">
          {review.comment}
        </p>
        {review.worker_reply ? (
          <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Phản hồi của worker
            </p>
            <p className="whitespace-pre-line">{review.worker_reply}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

type Props = {
  reviews: WorkerReviewItem[]
}

export function WorkerReviews({ reviews }: Props) {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm font-semibold">
          Đánh giá &amp; Phản hồi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {reviews.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Chưa có đánh giá nào
          </p>
        ) : (
          <div>
            {reviews.map((review, idx) => (
              <div key={review.id}>
                {idx > 0 ? <Separator /> : null}
                <ReviewItem review={review} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
