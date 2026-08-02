import { WorkerProfile } from "../../types/auth/user.types";

// The 10 free-text/simple fields that make up "đủ thông tin". gallery_urls is
// scored separately (photo bonus), not counted here.
const PROFILE_INFO_FIELDS = [
  "introduction",
  "date_of_birth",
  "height_cm",
  "weight_kg",
  "star_sign",
  "occupation",
  "lifestyle",
  "hobbies",
  "personality",
  "marital_status",
] as const;

export interface ProfileCompletenessConfig {
  photoBonus: number;
  minPhotos: number;
  perFieldBonus: number;
}

const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const computeProfileCompletenessScore = (
  profile: WorkerProfile | null | undefined,
  config: ProfileCompletenessConfig
): number => {
  if (!profile) return 0;

  const hasEnoughPhotos =
    (profile.gallery_urls?.length ?? 0) >= config.minPhotos;
  const filledFieldCount = PROFILE_INFO_FIELDS.filter((field) =>
    isFilled((profile as unknown as Record<string, unknown>)[field])
  ).length;

  return (
    (hasEnoughPhotos ? config.photoBonus : 0) +
    filledFieldCount * config.perFieldBonus
  );
};
