"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const BottomSheet = DialogPrimitive.Root
const BottomSheetTrigger = DialogPrimitive.Trigger
const BottomSheetClose = DialogPrimitive.Close

function BottomSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function BottomSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function BottomSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

const DRAG_CLOSE_THRESHOLD_PX = 120

function BottomSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ startY: number; lastY: number } | null>(null)

  const resetTranslate = () => {
    const el = contentRef.current
    if (!el) return
    el.style.transition = "transform 0.2s ease"
    el.style.transform = ""
  }

  const handlePointerDown = (event: React.PointerEvent) => {
    dragRef.current = { startY: event.clientY, lastY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current || !contentRef.current) return
    dragRef.current.lastY = event.clientY
    const delta = Math.max(0, event.clientY - dragRef.current.startY)
    contentRef.current.style.transition = "none"
    contentRef.current.style.transform = `translateY(${delta}px)`
  }

  const handlePointerUp = () => {
    if (!dragRef.current || !contentRef.current) return
    const delta = dragRef.current.lastY - dragRef.current.startY
    dragRef.current = null
    if (delta > DRAG_CLOSE_THRESHOLD_PX) {
      const height = contentRef.current.getBoundingClientRect().height
      contentRef.current.style.transition = "transform 0.15s ease-out"
      contentRef.current.style.transform = `translateY(${height}px)`
      window.setTimeout(() => closeRef.current?.click(), 150)
    } else {
      resetTranslate()
    }
  }

  return (
    <DialogPrimitive.Portal>
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          "fixed z-[60] w-full bg-background shadow-xl duration-300 sm:pt-5",
          // Mobile: bottom sheet
          "max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-2xl max-sm:border-t",
          "max-sm:data-[state=open]:animate-in max-sm:data-[state=open]:slide-in-from-bottom",
          "max-sm:data-[state=closed]:animate-out max-sm:data-[state=closed]:slide-out-to-bottom",
          // Desktop: centered modal
          "sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
          "sm:data-[state=open]:animate-in sm:data-[state=open]:fade-in-0 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:animate-out sm:data-[state=closed]:fade-out-0 sm:data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden="true" />
        {/* Drag handle (mobile only): drag down past threshold or swipe to dismiss */}
        <div
          className="flex touch-none justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
  BottomSheetTrigger,
}
