import { SERVICE_CATEGORIES } from "@/app/constants/constants";

export const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
  [SERVICE_CATEGORIES.ASSISTANCE]: "home.categories.assistance.title",
  [SERVICE_CATEGORIES.PERSONAL_ASSISTANT]:
    "home.categories.personalAssistant.title",
  [SERVICE_CATEGORIES.ON_SITE_PROFESSIONAL_ASSIST]:
    "home.categories.onSiteProfessional.title",
  [SERVICE_CATEGORIES.VIRTUAL_ASSISTANT]: "home.categories.virtualAssistant.title",
  [SERVICE_CATEGORIES.TOUR_GUIDE]: "home.categories.tourGuide.title",
  [SERVICE_CATEGORIES.TRANSLATOR]: "home.categories.translator.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP]: "home.categories.companionship.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_1]:
    "home.categories.companionshipLevel1.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_2]:
    "home.categories.companionshipLevel2.title",
  [SERVICE_CATEGORIES.COMPANIONSHIP_LEVEL_3]:
    "home.categories.companionshipLevel3.title",
};

export const PARENT_CATEGORIES: string[] = [
  SERVICE_CATEGORIES.ASSISTANCE,
  SERVICE_CATEGORIES.COMPANIONSHIP,
];

export enum ServicesPageConfig {
  SKELETON_COUNT = 8,
  PRIMARY_WORKER_INDEX = 0,
}
