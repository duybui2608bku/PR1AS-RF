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
import { CancellationReason } from "@/types/booking"

import { cancellationReasonLabel } from "../format"

type CancelBookingDialogProps = {
  open: boolean
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { reason: CancellationReason; notes: string }) => Promise<void> | void
}

const REASON_OPTIONS: CancellationReason[] = [
  CancellationReason.CLIENT_REQUEST,
  CancellationReason.SCHEDULE_CONFLICT,
  CancellationReason.EMERGENCY,
  CancellationReason.OTHER,
]

export function CancelBookingDialog({
  open,
  loading,
  onOpenChange,
  onSubmit,
}: CancelBookingDialogProps) {
  const [reason, setReason] = React.useState<CancellationReason>(
    CancellationReason.CLIENT_REQUEST,
  )
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setReason(CancellationReason.CLIENT_REQUEST)
      setNotes("")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!reason) {
      setError("Vui lòng chọn lý do hủy.")
      return
    }
    setError(null)
    await onSubmit({ reason, notes: notes.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hủy booking</DialogTitle>
          <DialogDescription>
            Vui lòng chọn lý do hủy. Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cancel-reason">Lý do</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as CancellationReason)}
              disabled={loading}
            >
              <SelectTrigger
                id="cancel-reason"
                className="h-10 w-full data-[size=default]:h-10"
              >
                <SelectValue placeholder="Chọn lý do hủy" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {cancellationReasonLabel[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cancel-notes">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="cancel-notes"
              maxLength={500}
              rows={4}
              placeholder="Mô tả thêm lý do hủy (tối đa 500 ký tự)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={loading}
            />
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
            Xác nhận hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
