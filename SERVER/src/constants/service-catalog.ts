import { ServiceCategory } from "../types/service/service.type";

// Source of truth for the v2 service catalog (Trợ lý ảo / Trợ lý thực tế).
// Each non-empty (category × service) cell becomes one Service document whose
// `code` is `<CATEGORY>_<SLUG>`. Descriptions differ per category.

export interface LocalizedCopy {
  en: string;
  vi: string;
  zh: string;
}

interface CatalogEntry {
  slug: string;
  icon: string;
  name: LocalizedCopy;
  // Per-category description. Omit a category if the service is not offered there.
  virtual?: LocalizedCopy;
  physical?: LocalizedCopy;
}

const CATALOG: CatalogEntry[] = [
  {
    slug: "OFFICE_BASIC",
    icon: "FileText",
    name: { vi: "Văn phòng cơ bản", en: "Basic Office", zh: "基础办公" },
    virtual: {
      vi: "Word, Excel, Canva, PowerPoint, mạng xã hội, v.v.",
      en: "Word, Excel, Canva, PowerPoint, social media, etc.",
      zh: "Word、Excel、Canva、PowerPoint、社交媒体等。",
    },
    physical: {
      vi: "Chuẩn bị, sắp xếp tài liệu, photocopy, thuyết trình, công chứng giấy tờ.",
      en: "Document preparation and organization, photocopying, presentations, notarization.",
      zh: "准备整理文件、复印、演示文稿、文件公证。",
    },
  },
  {
    slug: "HEALTH",
    icon: "HeartPulse",
    name: { vi: "Sức khoẻ", en: "Health", zh: "健康" },
    virtual: {
      vi: "Tư vấn tâm lý, dược, phương thức chữa trị hoặc nâng cao sức khoẻ.",
      en: "Psychological counseling, pharmacy, treatment methods, or health improvement.",
      zh: "心理咨询、药学、治疗方法或健康提升。",
    },
    physical: {
      vi: "Hỗ trợ bệnh nhân đi khám chữa, hoặc các hoạt động liên quan đến sức khoẻ.",
      en: "Assisting patients with medical visits or other health-related activities.",
      zh: "协助病人就医或其他与健康相关的活动。",
    },
  },
  {
    slug: "ART",
    icon: "Music",
    name: { vi: "Nghệ thuật", en: "Performing Arts", zh: "表演艺术" },
    virtual: {
      vi: "Hướng dẫn, tư vấn, hỗ trợ các hoạt động nghệ thuật, làm nhạc, chỉnh nhạc, vũ đạo, kịch bản.",
      en: "Guidance, consulting, and support for artistic activities: music production, music editing, choreography, scriptwriting.",
      zh: "艺术活动的指导、咨询与支持：制作音乐、修音、编舞、剧本。",
    },
    physical: {
      vi: "Hỗ trợ nghệ thuật: đàn, hát, biểu diễn, nhảy, múa.",
      en: "Art support: instruments, singing, performance, dancing.",
      zh: "艺术支持：乐器、演唱、表演、舞蹈。",
    },
  },
  {
    slug: "FINE_ART",
    icon: "Palette",
    name: { vi: "Mỹ thuật", en: "Fine Art", zh: "美术" },
    virtual: {
      vi: "Hướng dẫn, tư vấn, hỗ trợ các hoạt động mỹ thuật.",
      en: "Guidance, consulting, and support for fine art activities.",
      zh: "美术活动的指导、咨询与支持。",
    },
    physical: {
      vi: "Workshop, hướng dẫn thủ công, vẽ tranh, nặn tượng, v.v.",
      en: "Workshops, handicraft guidance, painting, sculpting, etc.",
      zh: "工作坊、手工指导、绘画、雕塑等。",
    },
  },
  {
    slug: "ENTERTAINMENT",
    icon: "Gamepad2",
    name: { vi: "Giải trí", en: "Entertainment", zh: "娱乐" },
    virtual: {
      vi: "Ca hát, chơi game, chat chit.",
      en: "Singing, gaming, casual chatting.",
      zh: "唱歌、玩游戏、闲聊。",
    },
    physical: {
      vi: "Các hình thức giải trí lành mạnh.",
      en: "Healthy forms of entertainment.",
      zh: "健康的娱乐形式。",
    },
  },
  {
    slug: "KNOWLEDGE",
    icon: "GraduationCap",
    name: { vi: "Kiến thức", en: "Knowledge", zh: "知识" },
    virtual: {
      vi: "Dạy học, tư vấn, hướng dẫn.",
      en: "Teaching, consulting, guidance.",
      zh: "教学、咨询、指导。",
    },
    physical: {
      vi: "Các hoạt động liên quan đến kiến thức chuyên môn của người làm.",
      en: "Activities related to the provider's professional knowledge.",
      zh: "与服务者专业知识相关的活动。",
    },
  },
  {
    slug: "TECH",
    icon: "Laptop",
    name: { vi: "Công nghệ", en: "Tech", zh: "技术" },
    virtual: {
      vi: "IT, digital marketing, admin, quản lý tài khoản.",
      en: "IT, digital marketing, admin, account management.",
      zh: "IT、数字营销、行政、账户管理。",
    },
    physical: {
      vi: "IT, digital marketing, admin, quản lý tài khoản.",
      en: "IT, digital marketing, admin, account management.",
      zh: "IT、数字营销、行政、账户管理。",
    },
  },
  {
    slug: "LEGAL",
    icon: "Scale",
    name: { vi: "Pháp lý", en: "Legal", zh: "法律" },
    virtual: {
      vi: "Tư vấn, hỗ trợ các vấn đề pháp lý liên quan.",
      en: "Consulting and support for related legal matters.",
      zh: "相关法律问题的咨询与支持。",
    },
  },
  {
    slug: "SPORTS",
    icon: "Dumbbell",
    name: { vi: "Thể thao", en: "Sports", zh: "体育" },
    virtual: {
      vi: "Thu mua, hỗ trợ các vấn đề liên quan đến thể thao.",
      en: "Procurement and support for sports-related matters.",
      zh: "体育相关事务的采购与支持。",
    },
  },
  {
    slug: "MODELING",
    icon: "Camera",
    name: { vi: "Modeling", en: "Modeling", zh: "模特" },
    virtual: {
      vi: "Chụp lookbook, influencer.",
      en: "Lookbook shoots, influencer.",
      zh: "Lookbook 拍摄、网红。",
    },
    physical: {
      vi: "Chụp ảnh, TVC, tham dự các sự kiện yêu cầu ngoại hình.",
      en: "Photoshoots, TVCs, attending events requiring a certain appearance.",
      zh: "拍照、广告片、出席需要外形的活动。",
    },
  },
  {
    slug: "NON_PROFESSIONAL",
    icon: "Briefcase",
    name: { vi: "Không chuyên môn", en: "General Tasks", zh: "通用事务" },
    physical: {
      vi: "Tham dự event, hỗ trợ event, bán hàng, hỗ trợ các việc không chuyên môn.",
      en: "Attending events, event support, sales, and other non-professional tasks.",
      zh: "出席活动、活动支持、销售及其他非专业工作。",
    },
  },
];

export interface ServiceSeed {
  category: ServiceCategory;
  code: string;
  icon: string;
  name: { en: string; vi: string; zh: string; ko: null };
  description: { en: string; vi: string; zh: string; ko: null };
}

const buildSeed = (
  entry: CatalogEntry,
  category: ServiceCategory,
  copy: LocalizedCopy
): ServiceSeed => ({
  category,
  code: `${category}_${entry.slug}`,
  icon: entry.icon,
  name: { ...entry.name, ko: null },
  description: { ...copy, ko: null },
});

// Flattened list of every Service document the catalog should contain.
export const SERVICE_CATALOG_V2: ServiceSeed[] = CATALOG.flatMap((entry) => {
  const seeds: ServiceSeed[] = [];
  if (entry.virtual) {
    seeds.push(buildSeed(entry, ServiceCategory.VIRTUAL, entry.virtual));
  }
  if (entry.physical) {
    seeds.push(buildSeed(entry, ServiceCategory.PHYSICAL, entry.physical));
  }
  return seeds;
});

// Old (v1) service code → new (v2) service code. Used to remap existing
// worker_service and booking records so references survive the migration.
export const OLD_TO_NEW_SERVICE_CODE: Record<string, string> = {
  VIRTUAL_ASSISTANT: "VIRTUAL_OFFICE_BASIC",
  DIRECT_SUPPORT: "PHYSICAL_OFFICE_BASIC",
  TRANSLATION: "PHYSICAL_NON_PROFESSIONAL",
  TOUR_GUIDE: "PHYSICAL_ENTERTAINMENT",
  PRESENCE: "PHYSICAL_ENTERTAINMENT",
  CONNECTION: "PHYSICAL_ENTERTAINMENT",
  FORMAL: "PHYSICAL_ENTERTAINMENT",
};

export const SERVICE_CATALOG_MIGRATION_NAME = "service-catalog-v2";
