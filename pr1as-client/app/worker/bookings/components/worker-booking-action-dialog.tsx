"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

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
import {
  BookingStatus,
  CancellationReason,
  type CancelBookingPayload,
  type UpdateBookingPayload,
  type UpdateBookingStatusPayload,
} from "@/types/booking"

export type WorkerBookingAction =
  | {
      type: "status"
      status: BookingStatus
      title: string
      description: string
      confirmLabel: string
      destructive?: boolean
    }
  | {
      type: "cancel"
      title: string
      description: string
      confirmLabel: string
      destructive: true
    }
  | {
      type: "response"
      title: string
      description: string
      confirmLabel: string
      initialResponse?: string
      destructive?: false
    }

type WorkerBookingActionDialogProps = {
  action: WorkerBookingAction | null
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onStatusSubmit: (values: UpdateBookingStatusPayload) => Promise<void> | void
  onResponseSubmit: (values: UpdateBookingPayload) => Promise<void> | void
  onCancelSubmit: (values: CancelBookingPayload) => Promise<void> | void
}

const WORKER_CANCEL_REASONS: CancellationReason[] = [
  CancellationReason.WORKER_UNAVAILABLE,
  CancellationReason.SCHEDULE_CONFLICT,
  CancellationReason.EMERGENCY,
  CancellationReason.OTHER,
]

const RESPONSE_MAX_LENGTH = 1000
const CANCEL_NOTES_MAX_LENGTH = 500

export function WorkerBookingActionDialog({
  action,
  loading,
  onOpenChange,
  onStatusSubmit,
  onResponseSubmit,
  onCancelSubmit,
}: WorkerBookingActionDialogProps) {
  const t = useTranslations("WorkerBookings.actionDialog")
  const tStatus = useTranslations("Bookings.statusLabels")
  const tCancellation = useTranslations("Bookings.cancellationReasons")
  const [workerResponse, setWorkerResponse] = React.useState("")
  const [cancelReason, setCancelReason] = React.useState<CancellationReason>(
    CancellationReason.WORKER_UNAVAILABLE
  )
  const [cancelNotes, setCancelNotes] = React.useState("")

  React.useEffect(() => {
    if (action?.type === "response") {
      const responseTimer = window.setTimeout(() => {
        setWorkerResponse(action.initialResponse ?? "")
      }, 0)

      return () => window.clearTimeout(responseTimer)
    }

    if (action) return

    const resetTimer = window.setTimeout(() => {
      setWorkerResponse("")
      setCancelReason(CancellationReason.WORKER_UNAVAILABLE)
      setCancelNotes("")
    }, 0)

    return () => window.clearTimeout(resetTimer)
  }, [action])

  if (!action) return null

  const handleConfirm = async () => {
    if (action.type === "cancel") {
      await onCancelSubmit({
        reason: cancelReason,
        notes: cancelNotes.trim(),
      })
      return
    }

    if (action.type === "response") {
      await onResponseSubmit({
        worker_response: workerResponse.trim(),
      })
      return
    }

    const trimmedResponse = workerResponse.trim()
    await onStatusSubmit({
      status: action.status,
      worker_response: trimmedResponse || undefined,
    })
  }

  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>

        {action.type === "cancel" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="worker-cancel-reason">{t("reason")}</Label>
              <Select
                value={cancelReason}
                onValueChange={(value) =>
                  setCancelReason(value as CancellationReason)
                }
                disabled={loading}
              >
                <SelectTrigger
                  id="worker-cancel-reason"
                  className="h-10 w-full data-[size=default]:h-10"
                >
                  <SelectValue placeholder={t("reasonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {WORKER_CANCEL_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {tCancellation(reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="worker-cancel-notes">{t("notes")}</Label>
              <Textarea
                id="worker-cancel-notes"
                maxLength={CANCEL_NOTES_MAX_LENGTH}
                rows={4}
                placeholder={t("notesPlaceholder")}
                value={cancelNotes}
                onChange={(event) => setCancelNotes(event.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {cancelNotes.length}/{CANCEL_NOTES_MAX_LENGTH}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="worker-response">
              {t("responseLabel")}
              <span className="text-muted-foreground"> {t("optional")}</span>
            </Label>
            <Textarea
              id="worker-response"
              maxLength={RESPONSE_MAX_LENGTH}
              rows={4}
              placeholder={
                action.type === "response"
                  ? t("responsePlaceholder")
                  : t("statusResponsePlaceholder", {
                      status: tStatus(action.status),
                    })
              }
              value={workerResponse}
              onChange={(event) => setWorkerResponse(event.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {workerResponse.length}/{RESPONSE_MAX_LENGTH}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("close")}
          </Button>
          <Button
            variant={action.destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {action.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
