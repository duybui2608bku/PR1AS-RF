"use client"

import { ChevronLeft, Menu } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { PrefsPanel } from "@/components/layout/mobile-prefs-sheet"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * Visual shell for the auth pages: minimal top bar + centered card.
 * The register page opts into a wider, two-column card; the rest stay narrow.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useTranslations("Nav")
  // Register has more fields — give it a wider card so they can sit in two
  // columns and the page stays short instead of one long scroll.
  const isWide = pathname === "/register"

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar tối giản: nút quay lại + icon-bar (theme/ngôn ngữ/tiền tệ). Không viền để liền mạch như app. */}
      <header className="pt-safe px-safe">
        <div className="flex h-14 items-center justify-between px-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-1 text-muted-foreground"
          >
            <Link href="/">
              <ChevronLeft className="size-4" />
              Trang chủ
            </Link>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("preferences")}>
                <Menu className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <PrefsPanel />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile: nội dung tràn màn hình. Desktop (sm+): gom vào card căn giữa. */}
      <main className="flex flex-1 flex-col px-4 pb-safe sm:items-center sm:justify-center sm:py-8">
        <div
          className={cn(
            "flex w-full flex-1 flex-col pb-6 pt-2 sm:flex-none sm:rounded-3xl sm:border sm:bg-card sm:p-8 sm:shadow-xl",
            isWide ? "sm:max-w-2xl" : "sm:max-w-md",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
