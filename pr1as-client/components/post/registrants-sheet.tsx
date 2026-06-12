"use client"

import Image from "next/image"
import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import { User, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { usePostRegistrations } from "@/lib/hooks/use-post-registrations"
import { cn } from "@/lib/utils"

interface RegistrantsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  registrationsCount: number
}

export function RegistrantsSheet({
  open,
  onOpenChange,
  postId,
  registrationsCount,
}: RegistrantsSheetProps) {
  const t = useTranslations("Registrants")
  const { data, isLoading } = usePostRegistrations(postId, open)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[55] bg-black/50",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-[60] flex flex-col bg-background shadow-xl outline-none duration-300",
            "inset-x-0 bottom-0 h-[70dvh] rounded-t-2xl border-t",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            "sm:inset-0 sm:m-auto sm:h-[60vh] sm:max-h-[520px] sm:w-full sm:max-w-lg sm:rounded-2xl sm:border",
          )}
        >
          <div className="flex justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <DialogPrimitive.Title className="text-base font-semibold">
              {t("title")}
              {registrationsCount > 0 ? ` (${registrationsCount})` : ""}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t("close")}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-transform hover:bg-accent active:scale-90"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 rounded-xl p-3">
                    <div className="size-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium">{t("emptyTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("emptyDesc")}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-3 gap-3 p-4">
                {data.data.map((reg) => (
                  <li key={reg.id}>
                    <Link
                      href={`/worker/${reg.worker.id}`}
                      className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent active:bg-accent/80"
                      onClick={() => onOpenChange(false)}
                    >
                      {reg.worker.avatar ? (
                        <Image
                          src={reg.worker.avatar}
                          alt={reg.worker.full_name ?? "Worker"}
                          width={64}
                          height={64}
                          className="size-16 rounded-full object-cover ring-2 ring-background transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full bg-muted ring-2 ring-background transition-transform duration-200 group-hover:scale-105">
                          <User className="size-7 text-muted-foreground" />
                        </div>
                      )}
                      <span className="w-full truncate text-center text-xs font-medium leading-tight">
                        {reg.worker.full_name ?? t("defaultUser")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
