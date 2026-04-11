"use client";

import { useState, useEffect } from "react";

export interface UseScrollOptions {
  /** When true, no listeners are attached (e.g. scroll driven by parent). */
  disabled?: boolean;
}

/**
 * Scroll gate with hysteresis: enter when scrollY > enter, leave when scrollY < exit.
 * Omit `exit` to use the same value for both (no hysteresis).
 */
export function useScroll(
  enter: number,
  exit: number = enter,
  options?: UseScrollOptions
): boolean {
  const disabled = options?.disabled ?? false;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || disabled) return;

    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled((prev) => {
        if (!prev && y > enter) return true;
        if (prev && y < exit) return false;
        return prev;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enter, exit, disabled]);

  return isScrolled;
}
