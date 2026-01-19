"use client";

import type { Service, ServiceUser } from "@/app/data/services.mock";
import type { WorkersGroupedByServiceResponse } from "@/lib/api/worker.api";
import { PricingUnit } from "@/lib/types/worker";

enum DefaultPrice {
  MIN = 0,
}

enum DefaultRating {
  VALUE = 4.5,
}

enum DefaultReviewCount {
  VALUE = 0,
}

enum DefaultLocation {
  VALUE = "TP.HCM",
}

enum PriceUnitMapping {
  HOURLY = "giờ",
  DAILY = "ngày",
  MONTHLY = "tháng",
}

const serviceImageMap: Record<string, string[]> = {
  PERSONAL_ASSISTANT: [
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  ],
  ON_SITE_PROFESSIONAL_ASSIST: [
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
  ],
  VIRTUAL_ASSISTANT: [
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop",
  ],
  TOUR_GUIDE: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop",
  ],
  TRANSLATOR: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop",
  ],
  COMPANIONSHIP_LEVEL_1: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  ],
  COMPANIONSHIP_LEVEL_2: [
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  ],
  COMPANIONSHIP_LEVEL_3: [
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  ],
};

function getRandomImage(serviceCode: string): string {
  const images =
    serviceImageMap[serviceCode] || serviceImageMap.PERSONAL_ASSISTANT;
  return images[Math.floor(Math.random() * images.length)];
}

function getDefaultAvatar(workerId: string): string {
  const avatarIndex = (workerId.charCodeAt(0) % 70) + 1;
  return `https://i.pravatar.cc/150?img=${avatarIndex}`;
}

function getPriceUnitFromPricingUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    [PricingUnit.HOURLY]: PriceUnitMapping.HOURLY,
    [PricingUnit.DAILY]: PriceUnitMapping.DAILY,
    [PricingUnit.MONTHLY]: PriceUnitMapping.MONTHLY,
  };
  return unitMap[unit] || PriceUnitMapping.HOURLY;
}

function getLowestPrice(
  pricing: Array<{
    unit: string;
    duration: number;
    price: number;
    currency: string;
  }>
): { price: number; unit: string } {
  if (pricing.length === 0) {
    return { price: DefaultPrice.MIN, unit: PriceUnitMapping.HOURLY };
  }

  const hourlyPricing = pricing.find((p) => p.unit === PricingUnit.HOURLY);
  if (hourlyPricing) {
    return {
      price: hourlyPricing.price,
      unit: getPriceUnitFromPricingUnit(hourlyPricing.unit),
    };
  }

  const sortedPricing = [...pricing].sort((a, b) => a.price - b.price);
  const lowest = sortedPricing[0];
  return {
    price: lowest.price,
    unit: getPriceUnitFromPricingUnit(lowest.unit),
  };
}

function transformWorkerToServiceUser(
  worker: WorkersGroupedByServiceResponse["workers"][0]
): ServiceUser {
  return {
    id: worker.id,
    name: worker.full_name || "Worker",
    avatar: worker.avatar || getDefaultAvatar(worker.id),
  };
}

export function transformWorkersGroupedByServiceToServices(
  data: WorkersGroupedByServiceResponse[],
  locale: string = "vi"
): Service[] {
  const services: Service[] = [];

  data.forEach((group) => {
    const serviceName =
      group.service.name[locale as keyof typeof group.service.name] ||
      group.service.name.vi ||
      group.service.code;

    group.workers.forEach((worker) => {
      const { price, unit } = getLowestPrice(worker.pricing);
      const workerImage =
        worker.worker_profile?.gallery_urls?.[0] ||
        getRandomImage(group.service.code);

      services.push({
        id: `${group.service.id}-${worker.id}`,
        title: serviceName,
        category: group.service.category,
        categoryCode: group.service.code,
        location: DefaultLocation.VALUE,
        price,
        priceUnit: unit,
        rating: DefaultRating.VALUE,
        reviewCount: DefaultReviewCount.VALUE,
        image: workerImage,
        users: [transformWorkerToServiceUser(worker)],
        featured: false,
        loved: false,
      });
    });
  });

  return services;
}
