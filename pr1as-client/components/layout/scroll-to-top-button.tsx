"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VISIBILITY_OFFSET = 360

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > VISIBILITY_OFFSET)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Cuộn lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 bottom-5 z-50 size-10 rounded-full border-border/70 bg-background/85 shadow-md backdrop-blur transition-all duration-200 sm:right-6 sm:bottom-6",
        "opacity-70 hover:opacity-100 focus-visible:opacity-100",
        isVisible
          ? "pointer-events-auto translate-y-0"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUp className="size-4" />
    </Button>
  )
}
