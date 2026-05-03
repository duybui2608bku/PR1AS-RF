"use client";

import React from "react";
import { Button, InputNumber, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { ServicePricing, PricingUnit } from "@/lib/types/worker";
import { PricingUnit as PricingUnitEnum } from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import styles from "./ServicePricingInline.module.scss";

interface ServicePricingInlineProps {
  pricing: ServicePricing[];
  currency: string;
  disabled?: boolean;
  onChange: (next: ServicePricing[]) => void;
}

function takenUnitsForRow(
  pricing: ServicePricing[],
  excludeIndex: number
): Set<PricingUnit> {
  return new Set(
    pricing
      .map((p, j) => (j !== excludeIndex ? p.unit : null))
      .filter((u): u is PricingUnit => u != null)
  );
}

export function ServicePricingInline({
  pricing,
  currency,
  disabled = false,
  onChange,
}: ServicePricingInlineProps) {
  const { t } = useI18n();

  const handleUnitChange = (index: number, unit: PricingUnit) => {
    const next = pricing.map((p, i) => (i === index ? { ...p, unit } : p));
    onChange(next);
  };

  const handlePriceChange = (index: number, value: number | null) => {
    const next = pricing.map((p, i) =>
      i === index
        ? {
            ...p,
            price:
              value == null || Number.isNaN(Number(value))
                ? 0
                : Number(value),
          }
        : p
    );
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(pricing.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([
      ...pricing,
      { unit: PricingUnitEnum.HOURLY, duration: 1, price: 0 },
    ]);
  };

  const handleAddFirst = () => {
    onChange([
      { unit: PricingUnitEnum.HOURLY, duration: 1, price: 0 },
    ]);
  };

  if (pricing.length === 0) {
    return (
      <div
        className={styles.block}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="link"
          disabled={disabled}
          onClick={handleAddFirst}
          className={styles.addBtn}
        >
          {t("worker.setup.step2.pricing.add")}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={styles.block}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {pricing.map((row, index) => {
        const taken = takenUnitsForRow(pricing, index);
        return (
          <div key={index} className={styles.row}>
            <div className={styles.fields}>
              <div className={styles.fieldStack}>
                <span className={styles.label}>
                  {t("worker.setup.step2.pricing.unit.label")}
                </span>
                <Select
                  className={styles.control}
                  size="middle"
                  value={row.unit}
                  disabled={disabled}
                  onChange={(u) => handleUnitChange(index, u as PricingUnit)}
                  options={[
                    PricingUnitEnum.HOURLY,
                    PricingUnitEnum.DAILY,
                    PricingUnitEnum.MONTHLY,
                  ].map((u) => ({
                    value: u,
                    label:
                      u === PricingUnitEnum.HOURLY
                        ? t("worker.setup.step2.pricing.unit.hour")
                        : u === PricingUnitEnum.DAILY
                          ? t("worker.setup.step2.pricing.unit.day")
                          : t("worker.setup.step2.pricing.unit.month"),
                    disabled: taken.has(u) && u !== row.unit,
                  }))}
                />
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
                    value={
                      row.price != null && row.price >= 0.01
                        ? row.price
                        : null
                    }
                    onChange={(v) => handlePriceChange(index, v)}
                    placeholder={t(
                      "worker.setup.step2.pricing.price.placeholder"
                    )}
                  />
                  <span className={styles.currencySuffix}>{currency}</span>
                </div>
              </div>
            </div>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              disabled={disabled}
              onClick={() => handleRemove(index)}
              className={styles.removeBtn}
              aria-label={t("worker.setup.step2.services.remove")}
            />
          </div>
        );
      })}
      <Button
        type="link"
        disabled={disabled}
        onClick={handleAdd}
        className={styles.addBtn}
      >
        {t("worker.setup.step2.pricing.add")}
      </Button>
    </div>
  );
}
