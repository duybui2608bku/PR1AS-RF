"use client";

import React, { useCallback, useMemo } from "react";
import { InputNumber, Typography } from "antd";
import type { ServicePricing, PricingUnit } from "@/lib/types/worker";
import { PricingUnit as PricingUnitEnum } from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import {
  normalizeWorkerPricingSlots,
  WORKER_SETUP_PRICING_SLOT_ORDER,
} from "./service-pricing.utils";
import styles from "./ServicePricingInline.module.scss";

const SETUP_PRICING_UNITS = WORKER_SETUP_PRICING_SLOT_ORDER;

interface ServicePricingInlineProps {
  pricing: ServicePricing[];
  currency: string;
  disabled?: boolean;
  onChange: (next: ServicePricing[]) => void;
}

function priceForUnit(
  pricing: ServicePricing[],
  unit: PricingUnit
): number | undefined {
  const row = pricing.find((p) => p.unit === unit);
  if (!row || row.price == null || row.price < 0.01) {
    return undefined;
  }
  return row.price;
}

function buildPricingFromUnits(
  unit: PricingUnit,
  value: number | null,
  current: ServicePricing[]
): ServicePricing[] {
  const map = new Map<PricingUnit, number>();
  for (const p of current) {
    if (p.unit && p.price >= 0.01) {
      map.set(p.unit, p.price);
    }
  }
  if (value == null || Number.isNaN(Number(value)) || value < 0.01) {
    map.delete(unit);
  } else {
    map.set(unit, Number(value));
  }
  return SETUP_PRICING_UNITS.filter((u) => map.has(u)).map((u) => ({
    unit: u,
    duration: 1,
    price: map.get(u)!,
  }));
}

export function ServicePricingInline({
  pricing,
  currency,
  disabled = false,
  onChange,
}: ServicePricingInlineProps) {
  const { t } = useI18n();
  const normalizedPricing = useMemo(
    () => normalizeWorkerPricingSlots(pricing),
    [pricing]
  );

  const unitLabel = useCallback(
    (unit: PricingUnit) =>
      unit === PricingUnitEnum.HOURLY
        ? t("worker.setup.step2.pricing.unit.hour")
        : unit === PricingUnitEnum.DAILY
          ? t("worker.setup.step2.pricing.unit.day")
          : t("worker.setup.step2.pricing.unit.month"),
    [t]
  );

  const handlePriceForUnit = (unit: PricingUnit, value: number | null) => {
    onChange(buildPricingFromUnits(unit, value, normalizedPricing));
  };

  return (
    <div
      className={styles.block}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Typography.Paragraph type="secondary" className={styles.hint}>
        {t("worker.setup.step2.pricing.info")}
      </Typography.Paragraph>
      <div className={styles.slotList}>
        {SETUP_PRICING_UNITS.map((unit) => {
          const stored = priceForUnit(normalizedPricing, unit);
          return (
            <div key={unit} className={styles.slotRow}>
              <div className={styles.fieldStack}>
                <span className={styles.label}>
                  {t("worker.setup.step2.pricing.unit.label")}
                </span>
                <div className={styles.unitReadout}>{unitLabel(unit)}</div>
              </div>
              <div className={styles.fieldStack}>
                <span className={styles.label}>
                  {t("worker.setup.step2.pricing.price.label")}
                </span>
                <div className={styles.priceField}>
                  <InputNumber
                    className={styles.priceInput}
                    min={0}
                    step={0.01}
                    disabled={disabled}
                    controls={false}
                    value={stored ?? null}
                    onChange={(v) => handlePriceForUnit(unit, v)}
                    placeholder={t(
                      "worker.setup.step2.pricing.price.placeholder"
                    )}
                  />
                  <span className={styles.currencySuffix}>{currency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
