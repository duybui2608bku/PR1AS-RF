"use client";

import { ReactNode, memo, useMemo } from "react";
import { Spacing } from "@/lib/constants/ui.constants";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

const BentoGridComponent = ({ children, className = "" }: BentoGridProps) => {
  const gridStyle = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: `${Spacing.XL}px`,
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: `0 ${Spacing.XL}px`,
  }), []);

  return (
    <div
      className={`bento-grid-desktop ${className}`}
      style={gridStyle}
    >
      {children}
    </div>
  );
};

export const BentoGrid = memo(BentoGridComponent);

interface BentoGridItemProps {
  children: ReactNode;
  span?: number;
  rowSpan?: number;
  className?: string;
}

const BentoGridItemComponent = ({
  children,
  span = 4,
  rowSpan = 1,
  className = "",
}: BentoGridItemProps) => {
  const itemStyle = useMemo(() => ({
    gridColumn: `span ${span}`,
    gridRow: `span ${rowSpan}`,
  }), [span, rowSpan]);

  return (
    <div
      className={className}
      style={itemStyle}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = memo(BentoGridItemComponent);

