"use client";

import { useEffect, useRef, useCallback } from "react";
import { ScrollAmount } from "@/lib/constants/ui.constants";
import styles from "./header-scroll-sentinel.module.scss";

/** Sentinel top must pass this (px above viewport top) to enter compact. */
const COMPACT_ENTER_TOP = -6;
/**
 * Sentinel top (px from viewport top) to leave compact — only when scrollY is
 * not already near the document top (see scroll exit below).
 */
const COMPACT_EXIT_TOP = 56;
/** Ignore further updates right after a toggle to damp layout-induced bursts. */
const LAYOUT_LOCK_MS = 220;

interface HeaderScrollSentinelProps {
  onCompactChange: (compact: boolean) => void;
}

/**
 * Drives sticky header compact mode from viewport geometry instead of
 * `window.scrollY`, so header height changes do not push scroll across a
 * scroll-based threshold and fight the layout (flicker).
 */
export function HeaderScrollSentinel({ onCompactChange }: HeaderScrollSentinelProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef(false);
  const lockUntilRef = useRef(0);

  const tick = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    if (typeof performance !== "undefined" && performance.now() < lockUntilRef.current) {
      return;
    }

    const top = el.getBoundingClientRect().top;
    const scrollY = window.scrollY;
    const prev = compactRef.current;
    let next = prev;

    // Always show full header + search near the top of the document (sentinel
    // `top` can stay small while compact because the sticky bar is short).
    if (scrollY <= ScrollAmount.HEADER_SCROLL_EXIT) {
      next = false;
    } else {
      if (!prev && top < COMPACT_ENTER_TOP) next = true;
      if (prev && top > COMPACT_EXIT_TOP) next = false;
    }

    if (next !== prev) {
      compactRef.current = next;
      lockUntilRef.current = performance.now() + LAYOUT_LOCK_MS;
      onCompactChange(next);
    }
  }, [onCompactChange]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(tick, {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
    });
    obs.observe(el);

    const onScroll = () => {
      tick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    tick();

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tick]);

  return <div ref={elRef} className={styles.sentinel} aria-hidden />;
}
