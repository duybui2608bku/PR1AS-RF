"use client";

import { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={`bento-grid-desktop ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: "24px",
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "0 24px",
      }}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  children: ReactNode;
  span?: number;
  rowSpan?: number;
  className?: string;
}

export function BentoGridItem({
  children,
  span = 4,
  rowSpan = 1,
  className = "",
}: BentoGridItemProps) {
  return (
    <div
      className={className}
      style={{
        gridColumn: `span ${span}`,
        gridRow: `span ${rowSpan}`,
      }}
    >
      {children}
    </div>
  );
}

