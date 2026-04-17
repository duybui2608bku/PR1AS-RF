"use client";

import { useMemo } from "react";
import { useWindowSize } from "./use-window-size";
import { Breakpoint } from "@/lib/constants/ui.constants";

/**
 * Hook to detect mobile viewport based on Breakpoint.MOBILE constant.
 * Replaces the duplicated useEffect + window.addEventListener("resize") pattern
 * found in chat/page.tsx, worker/bookings/page.tsx, client/bookings/page.tsx, etc.
 *
 * @param breakpoint - Optional custom breakpoint (default: Breakpoint.MOBILE = 768)
 * @returns boolean indicating if the current viewport is mobile
 */
export function useMobile(breakpoint: number = Breakpoint.MOBILE): boolean {
  const { width } = useWindowSize();

  return useMemo(() => {
    if (width === undefined) return false;
    return width < breakpoint;
  }, [width, breakpoint]);
}
