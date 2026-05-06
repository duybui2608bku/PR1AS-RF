"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DisputeReason } from "@/types/booking"

import { disputeReasonLabel } from "../format"

type DisputeBookingDialogProps = {
  open: boolean
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { reason: DisputeReason; description: string }) => Promise<void> | void
}

const REASON_OPTIONS: DisputeReason[] = [
  DisputeReason.SERVICE_NOT_AS_DESCRIBED,
  DisputeReason.WORKER_NO_SHOW,
  DisputeReason.POOR_QUALITY,
  DisputeReason.INCOMPLETE_SERVICE,
  DisputeReason.UNPROFESSIONAL_BEHAVIOR,
  DisputeReason.SAFETY_CONCERN,
  DisputeReason.OTHER,
]

const MIN_DESCRIPTION = 10
const MAX_DESCRIPTION = 2000

export function DisputeBookingDialog({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: DisputeBookingDialogProps) {
  const [reason, setReason] = React.useState<DisputeReason>(
    DisputeReason.SERVICE_NOT_AS_DESCRIBED,
  )
  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setReason(DisputeReason.SERVICE_NOT_AS_DESCRIBED)
      setDescription("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    const trimmed = description.trim()
    if (trimmed.length < MIN_DESCRIPTION) {
      setError(`Mô tả phải có ít nhất ${MIN_DESCRIPTION} ký tự.`)
      return
    }
    setError(null)
    await onSubmit({ reason, description: trimmed })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Khiếu nại booking</DialogTitle>
          <DialogDescription>
            Mô tả chi tiết vấn đề bạn gặp phải. Quản trị viên sẽ xử lý sớm nhất.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dispute-reason">Lý do</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as DisputeReason)}
              disabled={loading}
            >
              <SelectTrigger
                id="dispute-reason"
                className="h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue placeholder="Chọn lý do" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {disputeReasonLabel[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dispute-description">Mô tả chi tiết</Label>
            <Textarea
              id="dispute-description"
              minLength={MIN_DESCRIPTION}
              maxLength={MAX_DESCRIPTION}
              rows={5}
              placeholder={`Tối thiểu ${MIN_DESCRIPTION} ký tự`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/{MAX_DESCRIPTION}
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Đóng
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Gửi khiếu nại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
