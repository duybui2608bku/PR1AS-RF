"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import { FlipHorizontal, FlipVertical, Loader2, RotateCcw } from "lucide-react"

import { getCroppedFile, type FlipState } from "@/lib/utils/crop-image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImageEditorDialogProps {
  file: File | null
  aspect?: number
  queueInfo?: { current: number; total: number } | null
  onConfirm: (croppedFile: File) => void
  onSkip?: () => void
  onCancel: () => void
}

export function ImageEditorDialog({
  file,
  aspect,
  queueInfo,
  onConfirm,
  onSkip,
  onCancel,
}: ImageEditorDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false })
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [confirming, setConfirming] = useState(false)
  const t = useTranslations("ImageEditor")

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setFlip({ horizontal: false, vertical: false })
    setCroppedAreaPixels(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels || !file) return
    setConfirming(true)
    try {
      const cropped = await getCroppedFile(imageSrc, croppedAreaPixels, rotation, flip, file)
      onConfirm(cropped)
    } finally {
      setConfirming(false)
    }
  }

  const showSkip = !!onSkip && queueInfo && queueInfo.total > 1

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {t("title")}
            {queueInfo && queueInfo.total > 1 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {queueInfo.current}/{queueInfo.total}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative mx-4 mt-3 overflow-hidden rounded-lg bg-black" style={{ height: 340 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`}
              style={{ containerStyle: { borderRadius: 8 } }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3 px-4 py-3">
          {/* Rotate slider */}
          <div className="flex items-center gap-3">
            <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-primary"
            />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {rotation}°
            </span>
          </div>

          {/* Flip buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={flip.horizontal ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setFlip((f) => ({ ...f, horizontal: !f.horizontal }))}
            >
              <FlipHorizontal className="size-4" />
              {t("flipHorizontal")}
            </Button>
            <Button
              type="button"
              variant={flip.vertical ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setFlip((f) => ({ ...f, vertical: !f.vertical }))}
            >
              <FlipVertical className="size-4" />
              {t("flipVertical")}
            </Button>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={confirming}>
            {t("cancel")}
          </Button>
          {showSkip && (
            <Button type="button" variant="outline" onClick={onSkip} disabled={confirming}>
              {t("skip")}
            </Button>
          )}
          <Button type="button" onClick={handleConfirm} disabled={confirming}>
            {confirming && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
