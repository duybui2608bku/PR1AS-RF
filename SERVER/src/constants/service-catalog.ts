import { ServiceCategory } from "../types/service/service.type";

export interface LocalizedCopy {
  en: string;
  vi: string;
  zh: string;
  ko: string;
}

interface CatalogEntry {
  slug: string;
  icon: string;
  name: LocalizedCopy;
  virtual?: LocalizedCopy;
  physical?: LocalizedCopy;
}

const CATALOG: CatalogEntry[] = [
  {
    slug: "OFFICE_BASIC",
    icon: "FileText",
    name: { vi: "Văn phòng cơ bản", en: "Basic Office", zh: "基础办公", ko: "기본 사무" },
    virtual: {
      vi: "Word, Excel, Canva, PowerPoint, mạng xã hội, v.v.",
      en: "Word, Excel, Canva, PowerPoint, social media, etc.",
      zh: "Word、Excel、Canva、PowerPoint、社交媒体等。",
      ko: "Word, Excel, Canva, PowerPoint, 소셜 미디어 등.",
    },
    physical: {
      vi: "Chuẩn bị, sắp xếp tài liệu, photocopy, thuyết trình, công chứng giấy tờ.",
      en: "Document preparation and organization, photocopying, presentations, notarization.",
      zh: "准备整理文件、复印、演示文稿、文件公证。",
      ko: "문서 준비 및 정리, 복사, 발표 자료, 공증 업무 지원.",
    },
  },
  {
    slug: "HEALTH",
    icon: "HeartPulse",
    name: { vi: "Sức khoẻ", en: "Health", zh: "健康", ko: "건강" },
    virtual: {
      vi: "Tư vấn tâm lý, dược, phương thức chữa trị hoặc nâng cao sức khoẻ.",
      en: "Psychological counseling, pharmacy, treatment methods, or health improvement.",
      zh: "心理咨询、药学、治疗方法或健康提升。",
      ko: "심리 상담, 약학, 치료 방법 또는 건강 증진 상담.",
    },
    physical: {
      vi: "Hỗ trợ bệnh nhân đi khám chữa, hoặc các hoạt động liên quan đến sức khoẻ.",
      en: "Assisting patients with medical visits or other health-related activities.",
      zh: "协助病人就医或其他与健康相关的活动。",
      ko: "진료 동행 및 건강 관련 활동 지원.",
    },
  },
  {
    slug: "ART",
    icon: "Music",
    name: { vi: "Nghệ thuật", en: "Performing Arts", zh: "表演艺术", ko: "공연 예술" },
    virtual: {
      vi: "Hướng dẫn, tư vấn, hỗ trợ các hoạt động nghệ thuật, làm nhạc, chỉnh nhạc, vũ đạo, kịch bản.",
      en: "Guidance, consulting, and support for artistic activities: music production, music editing, choreography, scriptwriting.",
      zh: "艺术活动的指导、咨询与支持：制作音乐、修音、编舞、剧本。",
      ko: "음악 제작, 음정 보정, 안무, 대본 작성 등 예술 활동 안내 및 지원.",
    },
    physical: {
      vi: "Hỗ trợ nghệ thuật: đàn, hát, biểu diễn, nhảy, múa.",
      en: "Art support: instruments, singing, performance, dancing.",
      zh: "艺术支持：乐器、演唱、表演、舞蹈。",
      ko: "악기, 노래, 공연, 춤 등 예술 활동 지원.",
    },
  },
  {
    slug: "FINE_ART",
    icon: "Palette",
    name: { vi: "Mỹ thuật", en: "Fine Art", zh: "美术", ko: "미술" },
    virtual: {
      vi: "Hướng dẫn, tư vấn, hỗ trợ các hoạt động mỹ thuật.",
      en: "Guidance, consulting, and support for fine art activities.",
      zh: "美术活动的指导、咨询与支持。",
      ko: "미술 활동에 대한 안내, 상담 및 지원.",
    },
    physical: {
      vi: "Workshop, hướng dẫn thủ công, vẽ tranh, nặn tượng, v.v.",
      en: "Workshops, handicraft guidance, painting, sculpting, etc.",
      zh: "工作坊、手工指导、绘画、雕塑等。",
      ko: "워크숍, 공예 지도, 그림, 조각 등.",
    },
  },
  {
    slug: "ENTERTAINMENT",
    icon: "Gamepad2",
    name: { vi: "Giải trí", en: "Entertainment", zh: "娱乐", ko: "엔터테인먼트" },
    virtual: {
      vi: "Ca hát, chơi game, chat chit.",
      en: "Singing, gaming, casual chatting.",
      zh: "唱歌、玩游戏、闲聊。",
      ko: "노래, 게임, 가벼운 대화.",
    },
    physical: {
      vi: "Các hình thức giải trí lành mạnh.",
      en: "Healthy forms of entertainment.",
      zh: "健康的娱乐形式。",
      ko: "건전한 형태의 여가 및 엔터테인먼트 활동.",
    },
  },
  {
    slug: "KNOWLEDGE",
    icon: "GraduationCap",
    name: { vi: "Kiến thức", en: "Knowledge", zh: "知识", ko: "지식" },
    virtual: {
      vi: "Dạy học, tư vấn, hướng dẫn.",
      en: "Teaching, consulting, guidance.",
      zh: "教学、咨询、指导。",
      ko: "학습 지도, 상담, 안내.",
    },
    physical: {
      vi: "Các hoạt động liên quan đến kiến thức chuyên môn của người làm.",
      en: "Activities related to the provider's professional knowledge.",
      zh: "与服务者专业知识相关的活动。",
      ko: "제공자의 전문 지식과 관련된 활동.",
    },
  },
  {
    slug: "TECH",
    icon: "Laptop",
    name: { vi: "Công nghệ", en: "Tech", zh: "技术", ko: "기술" },
    virtual: {
      vi: "IT, digital marketing, admin, quản lý tài khoản.",
      en: "IT, digital marketing, admin, account management.",
      zh: "IT、数字营销、行政、账户管理。",
      ko: "IT, 디지털 마케팅, 관리자 업무, 계정 관리.",
    },
    physical: {
      vi: "IT, digital marketing, admin, quản lý tài khoản.",
      en: "IT, digital marketing, admin, account management.",
      zh: "IT、数字营销、行政、账户管理。",
      ko: "IT, 디지털 마케팅, 관리자 업무, 계정 관리.",
    },
  },
  {
    slug: "LEGAL",
    icon: "Scale",
    name: { vi: "Pháp lý", en: "Legal", zh: "法律", ko: "법률" },
    virtual: {
      vi: "Tư vấn, hỗ trợ các vấn đề pháp lý liên quan.",
      en: "Consulting and support for related legal matters.",
      zh: "相关法律问题的咨询与支持。",
      ko: "관련 법률 문제에 대한 상담 및 지원.",
    },
  },
  {
    slug: "SPORTS",
    icon: "Dumbbell",
    name: { vi: "Thể thao", en: "Sports", zh: "体育", ko: "스포츠" },
    virtual: {
      vi: "Thu mua, hỗ trợ các vấn đề liên quan đến thể thao.",
      en: "Procurement and support for sports-related matters.",
      zh: "体育相关事务的采购与支持。",
      ko: "스포츠 관련 물품 구매 및 관련 업무 지원.",
    },
  },
  {
    slug: "MODELING",
    icon: "Camera",
    name: { vi: "Modeling", en: "Modeling", zh: "模特", ko: "모델링" },
    virtual: {
      vi: "Chụp lookbook, influencer.",
      en: "Lookbook shoots, influencer.",
      zh: "Lookbook 拍摄、网红。",
      ko: "룩북 촬영, 인플루언서 활동.",
    },
    physical: {
      vi: "Chụp ảnh, TVC, tham dự các sự kiện yêu cầu ngoại hình.",
      en: "Photoshoots, TVCs, attending events requiring a certain appearance.",
      zh: "拍照、广告片、出席需要外形的活动。",
      ko: "사진 촬영, TVC, 외모 조건이 필요한 이벤트 참석.",
    },
  },
  {
    slug: "NON_PROFESSIONAL",
    icon: "Briefcase",
    name: { vi: "Không chuyên môn", en: "General Tasks", zh: "通用事务", ko: "일반 업무" },
    physical: {
      vi: "Tham dự event, hỗ trợ event, bán hàng, hỗ trợ các việc không chuyên môn.",
      en: "Attending events, event support, sales, and other non-professional tasks.",
      zh: "出席活动、活动支持、销售及其他非专业工作。",
      ko: "이벤트 참석, 이벤트 지원, 판매 및 기타 비전문 업무.",
    },
  },
];

export interface ServiceSeed {
  category: ServiceCategory;
  code: string;
  icon: string;
  name: LocalizedCopy;
  description: LocalizedCopy;
}

const buildSeed = (
  entry: CatalogEntry,
  category: ServiceCategory,
  copy: LocalizedCopy
): ServiceSeed => ({
  category,
  code: `${category}_${entry.slug}`,
  icon: entry.icon,
  name: entry.name,
  description: copy,
});

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

export const OLD_TO_NEW_SERVICE_CODE: Record<string, string> = {
  VIRTUAL_ASSISTANT: "VIRTUAL_OFFICE_BASIC",
  DIRECT_SUPPORT: "PHYSICAL_OFFICE_BASIC",
  TRANSLATION: "PHYSICAL_NON_PROFESSIONAL",
  TOUR_GUIDE: "PHYSICAL_ENTERTAINMENT",
  PRESENCE: "PHYSICAL_ENTERTAINMENT",
  CONNECTION: "PHYSICAL_ENTERTAINMENT",
  FORMAL: "PHYSICAL_ENTERTAINMENT",
};

export const SERVICE_CATALOG_MIGRATION_NAME = "service-catalog-v2-ko";
