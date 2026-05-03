/**
 * Upserts catalogue `service` documents so Vietnamese labels match the
 * Stitch worker profile mock (and adds base COMPANIONSHIP if missing).
 *
 * From SERVER directory (with .env: MONGODB_URI, DB_NAME):
 *   npm run seed:services-stitch
 */
import "dotenv/config";
import { connectDatabase, closeDatabase } from "../config/database";
import { Service } from "../models/service/service";
import {
  DressCode,
  ServiceCategory,
} from "../types/service/service.type";
import { logger } from "../utils/logger";

interface StitchServiceDef {
  code: string;
  category: ServiceCategory;
  companionship_level: number | null;
  name: { vi: string; en: string };
  description: { vi: string; en: string };
}

const STITCH_SERVICES: StitchServiceDef[] = [
  {
    code: "PERSONAL_ASSISTANT",
    category: ServiceCategory.ASSISTANCE,
    companionship_level: null,
    name: { vi: "Trợ lý cá nhân", en: "Personal assistant" },
    description: {
      vi: "Trợ lý cá nhân theo yêu cầu.",
      en: "Personal assistant services.",
    },
  },
  {
    code: "ON_SITE_PROFESSIONAL_ASSIST",
    category: ServiceCategory.ASSISTANCE,
    companionship_level: null,
    name: { vi: "Trợ lý tại chỗ", en: "On-site assistant" },
    description: {
      vi: "Hỗ trợ chuyên nghiệp tại địa điểm.",
      en: "Professional on-site assistance.",
    },
  },
  {
    code: "VIRTUAL_ASSISTANT",
    category: ServiceCategory.ASSISTANCE,
    companionship_level: null,
    name: { vi: "Trợ lý ảo", en: "Virtual assistant" },
    description: {
      vi: "Hỗ trợ từ xa.",
      en: "Remote assistance.",
    },
  },
  {
    code: "TOUR_GUIDE",
    category: ServiceCategory.ASSISTANCE,
    companionship_level: null,
    name: { vi: "Hướng dẫn viên du lịch", en: "Tour guide" },
    description: {
      vi: "Hướng dẫn và đồng hành du lịch.",
      en: "Tour guiding and travel support.",
    },
  },
  {
    code: "TRANSLATOR",
    category: ServiceCategory.ASSISTANCE,
    companionship_level: null,
    name: { vi: "Phiên dịch", en: "Interpreter / translator" },
    description: {
      vi: "Phiên dịch và hỗ trợ ngôn ngữ.",
      en: "Interpretation and language support.",
    },
  },
  {
    code: "COMPANIONSHIP",
    category: ServiceCategory.COMPANIONSHIP,
    companionship_level: null,
    name: { vi: "Dịch vụ đồng hành", en: "Companionship service" },
    description: {
      vi: "Dịch vụ đồng hành theo giờ hoặc gói.",
      en: "Hourly or packaged companionship.",
    },
  },
  {
    code: "COMPANIONSHIP_LEVEL_1",
    category: ServiceCategory.COMPANIONSHIP,
    companionship_level: 1,
    name: { vi: "Dịch vụ đồng hành cấp 1", en: "Companionship level 1" },
    description: {
      vi: "Gói đồng hành cấp 1.",
      en: "Companionship package level 1.",
    },
  },
  {
    code: "COMPANIONSHIP_LEVEL_2",
    category: ServiceCategory.COMPANIONSHIP,
    companionship_level: 2,
    name: { vi: "Dịch vụ đồng hành cấp 2", en: "Companionship level 2" },
    description: {
      vi: "Gói đồng hành cấp 2.",
      en: "Companionship package level 2.",
    },
  },
  {
    code: "COMPANIONSHIP_LEVEL_3",
    category: ServiceCategory.COMPANIONSHIP,
    companionship_level: 3,
    name: { vi: "Dịch vụ đồng hành cấp 3", en: "Companionship level 3" },
    description: {
      vi: "Gói đồng hành cấp 3.",
      en: "Companionship package level 3.",
    },
  },
];

function companionRules() {
  return {
    physical_touch: false,
    intellectual_conversation_required: false,
    dress_code: DressCode.CASUAL,
  };
}

async function upsertService(def: StitchServiceDef): Promise<void> {
  const code = def.code.toUpperCase().trim();
  const now = new Date();
  const rules =
    def.category === ServiceCategory.COMPANIONSHIP &&
    def.companionship_level != null
      ? companionRules()
      : null;

  const existing = await Service.findOne({ code });

  if (existing) {
    await Service.updateOne(
      { _id: existing._id },
      {
        $set: {
          category: def.category,
          companionship_level: def.companionship_level,
          name: def.name,
          description: def.description,
          rules,
          is_active: true,
          updated_at: now,
        },
      }
    );
    return;
  }

  await Service.create({
    category: def.category,
    code,
    name: def.name,
    description: def.description,
    companionship_level: def.companionship_level,
    rules,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    for (const def of STITCH_SERVICES) {
      await upsertService(def);
    }
    logger.info(
      `seed-services-stitch: upserted ${STITCH_SERVICES.length} services by code.`
    );
  } finally {
    await closeDatabase();
  }
}

void main().catch((err: unknown) => {
  logger.error("seed-services-stitch failed", err);
  process.exit(1);
});
