export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum Experience {
  LESS_THAN_1 = "LESS_THAN_1",
  ONE_TO_3 = "ONE_TO_3",
  THREE_TO_5 = "THREE_TO_5",
  FIVE_TO_10 = "FIVE_TO_10",
  MORE_THAN_10 = "MORE_THAN_10",
}

export interface WorkerProfile {
  date_of_birth?: string;
  gender: Gender;
  height_cm?: number;
  weight_kg?: number;
  star_sign?: string;
  lifestyle?: string;
  hobbies: string[];
  quote?: string;
  introduction?: string;
  gallery_urls: string[];
  experience?: Experience;
  title?: string;
  coords?: {
    latitude: number | null;
    longitude: number | null;
  };
}

export interface WorkerProfileUpdateInput {
  date_of_birth?: string;
  gender: Gender;
  height_cm?: number;
  weight_kg?: number;
  star_sign?: string;
  lifestyle?: string;
  hobbies?: string[];
  quote?: string;
  introduction?: string;
  gallery_urls?: string[];
  experience?: Experience;
  title?: string;
  coords?: {
    latitude: number | null;
    longitude: number | null;
  };
}

export enum ServiceCategory {
  ASSISTANCE = "ASSISTANCE",
  COMPANIONSHIP = "COMPANIONSHIP",
}

export enum DressCode {
  CASUAL = "CASUAL",
  SEMI_FORMAL = "SEMI_FORMAL",
  FORMAL = "FORMAL",
}

export interface Service {
  id: string;
  category: ServiceCategory;
  code: string;
  name: {
    en: string;
    vi: string;
    zh?: string;
    ko?: string;
  };
  description: {
    en: string;
    vi: string;
    zh?: string;
    ko?: string;
  };
  companionship_level: number | null;
  rules: {
    physical_touch: boolean;
    intellectual_conversation_required: boolean;
    dress_code: DressCode;
  } | null;
  is_active: boolean;
}

export enum PricingUnit {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
}

export interface ServicePricing {
  unit: PricingUnit;
  duration: number; // Số lượng đơn vị (ví dụ: 1 giờ, 2 giờ, 3 ngày)
  price: number; // Giá theo đơn vị tiền tệ của user
}

export interface WorkerService {
  service_id: string;
  service_code: string;
  pricing: ServicePricing[];
  is_active: boolean;
}

export interface WorkerServiceInput {
  services: Array<{
    service_id: string;
    pricing: ServicePricing[];
  }>;
}

/**
 * Star Signs (Cung hoàng đạo)
 */
export const STAR_SIGNS = [
  { value: "aries", label: "Bạch Dương (Aries)" },
  { value: "taurus", label: "Kim Ngưu (Taurus)" },
  { value: "gemini", label: "Song Tử (Gemini)" },
  { value: "cancer", label: "Cự Giải (Cancer)" },
  { value: "leo", label: "Sư Tử (Leo)" },
  { value: "virgo", label: "Xử Nữ (Virgo)" },
  { value: "libra", label: "Thiên Bình (Libra)" },
  { value: "scorpio", label: "Bọ Cạp (Scorpio)" },
  { value: "sagittarius", label: "Nhân Mã (Sagittarius)" },
  { value: "capricorn", label: "Ma Kết (Capricorn)" },
  { value: "aquarius", label: "Bảo Bình (Aquarius)" },
  { value: "pisces", label: "Song Ngư (Pisces)" },
] as const;
