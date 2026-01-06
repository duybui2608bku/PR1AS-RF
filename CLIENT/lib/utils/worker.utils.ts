import React from "react";
import { UserOutlined, ManOutlined, WomanOutlined } from "@ant-design/icons";
import { Gender, Experience, Service, PricingUnit } from "../types/worker";

export function getGenderIcon(gender?: Gender): React.ReactNode {
  switch (gender) {
    case Gender.MALE:
      return React.createElement(ManOutlined);
    case Gender.FEMALE:
      return React.createElement(WomanOutlined);
    default:
      return React.createElement(UserOutlined);
  }
}

export function getGenderLabelKey(gender?: Gender): string {
  switch (gender) {
    case Gender.MALE:
      return "worker.detail.gender.male";
    case Gender.FEMALE:
      return "worker.detail.gender.female";
    default:
      return "worker.detail.gender.other";
  }
}

export function getExperienceLabelKey(experience?: Experience): string {
  if (!experience) {
    return "worker.detail.experience.noInfo";
  }
  const experienceKeyMap: Record<Experience, string> = {
    [Experience.LESS_THAN_1]: "worker.detail.experience.lessThan1",
    [Experience.ONE_TO_3]: "worker.detail.experience.oneTo3",
    [Experience.THREE_TO_5]: "worker.detail.experience.threeTo5",
    [Experience.FIVE_TO_10]: "worker.detail.experience.fiveTo10",
    [Experience.MORE_THAN_10]: "worker.detail.experience.moreThan10",
  };
  return experienceKeyMap[experience];
}

export function randomColorTag(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

export function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

export interface FormatPriceOptions {
  price: number;
  unit: PricingUnit | string;
  currencyCode: string;
  unitLabels: {
    HOURLY: string;
    DAILY: string;
    MONTHLY: string;
  };
}

export function formatPrice({
  price,
  unit,
  currencyCode,
  unitLabels,
}: FormatPriceOptions): string {
  const currencySymbols: Record<string, string> = {
    VND: "₫",
    USD: "$",
    KRW: "₩",
    CNY: "¥",
  };
  const symbol = currencySymbols[currencyCode] || currencyCode;
  const formattedPrice = new Intl.NumberFormat("vi-VN").format(price);

  const unitLabel =
    unitLabels[unit as keyof typeof unitLabels] || unit.toLowerCase();

  return `${formattedPrice} ${symbol}/${unitLabel}`;
}

export interface GetServiceNameOptions {
  serviceCode: string;
  serviceMap: Map<string, Service>;
  locale: string;
}

export function getServiceName({
  serviceCode,
  serviceMap,
  locale,
}: GetServiceNameOptions): string {
  const service = serviceMap.get(serviceCode);
  if (!service) return serviceCode;

  const localeMap: Record<string, keyof Service["name"]> = {
    en: "en",
    vi: "vi",
    zh: "zh",
    ko: "ko",
  };

  const localeKey = localeMap[locale] || "en";
  return service.name[localeKey] || service.name.en || serviceCode;
}
