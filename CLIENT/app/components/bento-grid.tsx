"use client";

import { ReactNode, memo } from "react";
import { BentoItemSpan } from "@/lib/constants/ui.constants";
import styles from "./bento-grid.module.scss";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

const BentoGridComponent = ({ children, className = "" }: BentoGridProps) => (
  <div className={`${styles.grid} ${className}`}>
    {children}
  </div>
);

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
}: BentoGridItemProps) => (
  <div
    className={`${styles.item} ${className}`}
    style={
      {
        ["--bento-span" as string]: String(span),
        ["--bento-row-span" as string]: String(rowSpan),
      } as React.CSSProperties
    }
  >
    {children}
  </div>
);

export const BentoGridItem = memo(BentoGridItemComponent);

