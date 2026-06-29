import type { AboutContentData } from "../types/about";

export const ABOUT_MESSAGES = {
  FETCHED: "About content fetched successfully",
  UPDATED: "About content updated successfully",
  RESET: "About content reset to defaults",
} as const;

/**
 * Factory default content for the public About page. Seeds the singleton on
 * first access and is the target for the admin "reset" action. Mirrors the
 * next-intl `About` namespace in `pr1as-client/messages/*.json`, which remains
 * the ultimate per-field fallback on the public page.
 */
export const ABOUT_DEFAULTS: AboutContentData = {
  hero: {
    badge: {
      vi: "Về chúng tôi",
      en: "About us",
      zh: "关于我们",
      ko: "소개",
    },
    title: {
      vi: "Kết nối mọi người với dịch vụ đáng tin cậy",
      en: "Connecting people with services they can trust",
      zh: "连接人们与值得信赖的服务",
      ko: "믿을 수 있는 서비스와 사람을 연결합니다",
    },
    subtitle: {
      vi: "PR1AS là nền tảng nơi khách hàng gặp gỡ các worker và freelancer uy tín — khám phá dịch vụ, đặt lịch an tâm và quản lý mọi thứ tại một nơi.",
      en: "PR1AS is the marketplace where clients meet reliable workers and freelancers — discover services, book with confidence, and manage everything in one place.",
      zh: "PR1AS 是客户与可靠工作者和自由职业者相遇的平台——发现服务、安心预约，并在一处管理一切。",
      ko: "PR1AS는 고객이 신뢰할 수 있는 작업자와 프리랜서를 만나는 마켓플레이스입니다. 서비스를 발견하고 안심하고 예약하며 모든 것을 한곳에서 관리하세요.",
    },
  },
  what: {
    title: {
      vi: "PR1AS là gì",
      en: "What is PR1AS",
      zh: "PR1AS 是什么",
      ko: "PR1AS란?",
    },
    tagline: {
      vi: "Nền tảng dịch vụ đáng tin cậy của bạn",
      en: "Your trusted service marketplace",
      zh: "您值得信赖的服务平台",
      ko: "신뢰할 수 있는 서비스 마켓플레이스",
    },
    body: {
      vi: "<p>PR1AS là nền tảng toàn diện kết nối khách hàng với các worker và freelancer đã được xác minh, cung cấp đa dạng dịch vụ chuyên nghiệp và đồng hành.</p><p>Từ việc tìm đúng người, đặt lịch, trò chuyện đến thanh toán trực tuyến an toàn, PR1AS đưa mọi bước vào một trải nghiệm liền mạch.</p><p>Chúng tôi được xây dựng dựa trên sự tin cậy, minh bạch và chất lượng — để cả khách hàng lẫn người cung cấp dịch vụ tập trung vào điều quan trọng nhất.</p>",
      en: "<p>PR1AS is a full-service platform that connects clients with verified workers and freelancers offering a wide range of professional and companionship services.</p><p>From discovering the right provider to booking, chatting, and paying securely online, PR1AS brings every step of the journey into one seamless experience.</p><p>We are built around trust, transparency and quality — so both clients and service providers can focus on what truly matters.</p>",
      zh: "<p>PR1AS 是一个全方位平台，将客户与经过验证的工作者和自由职业者连接起来，提供丰富的专业与陪伴服务。</p><p>从找到合适的人、预约、聊天到安全的在线付款，PR1AS 将每一步融入无缝的体验之中。</p><p>我们以信任、透明和品质为核心——让客户与服务提供者都能专注于真正重要的事。</p>",
      ko: "<p>PR1AS는 다양한 전문 서비스와 동행 서비스를 제공하는 인증된 작업자 및 프리랜서를 고객과 연결하는 종합 플랫폼입니다.</p><p>적합한 제공자를 찾는 순간부터 예약, 채팅, 안전한 온라인 결제까지 PR1AS는 모든 과정을 매끄러운 경험으로 연결합니다.</p><p>우리는 신뢰, 투명성, 품질을 중심으로 구축되어 고객과 서비스 제공자가 진정으로 중요한 일에 집중할 수 있도록 돕습니다.</p>",
    },
  },
  why: {
    title: {
      vi: "Vì sao chọn chúng tôi",
      en: "Why Choose Us",
      zh: "为何选择我们",
      ko: "왜 PR1AS를 선택해야 할까요",
    },
    subtitle: {
      vi: "Chúng tôi luôn hướng tới trải nghiệm an toàn, công bằng và dễ dàng cho mọi người trên nền tảng.",
      en: "We obsess over a safe, fair and effortless experience for everyone on the platform.",
      zh: "我们致力于为平台上的每个人带来安全、公平且轻松的体验。",
      ko: "플랫폼의 모든 사용자를 위해 안전하고 공정하며 쉬운 경험을 세심하게 설계합니다.",
    },
    items: [
      {
        title: {
          vi: "Xác minh & uy tín",
          en: "Verified & trusted",
          zh: "经过验证、值得信赖",
          ko: "인증과 신뢰",
        },
        description: {
          vi: "Mọi người cung cấp dịch vụ đều được kiểm tra danh tính và chất lượng, cùng hệ thống uy tín giữ chuẩn mực cao.",
          en: "Every provider goes through identity and quality checks, with a reputation system that keeps standards high.",
          zh: "每位服务提供者都经过身份与品质审核，并有信誉系统保持高标准。",
          ko: "모든 제공자는 신원 및 품질 확인을 거치며, 평판 시스템이 높은 기준을 유지합니다.",
        },
      },
      {
        title: {
          vi: "Chất lượng đáng tin",
          en: "Quality you can rely on",
          zh: "可信赖的品质",
          ko: "믿을 수 있는 품질",
        },
        description: {
          vi: "Đánh giá thật, hồ sơ minh bạch và xếp hạng giúp bạn tự tin chọn đúng người.",
          en: "Real reviews, transparent profiles and ratings help you choose the right person with confidence.",
          zh: "真实评价、透明资料与评分，帮助您自信地选择合适的人。",
          ko: "실제 리뷰, 투명한 프로필, 평점을 통해 안심하고 적합한 사람을 선택할 수 있습니다.",
        },
      },
      {
        title: {
          vi: "Thanh toán minh bạch",
          en: "Transparent payments",
          zh: "透明付款",
          ko: "투명한 결제",
        },
        description: {
          vi: "Giá rõ ràng theo tiền tệ của bạn và nạp tiền trực tuyến an toàn — không phí ẩn, không bất ngờ.",
          en: "Clear pricing in your currency and secure online top-up — no hidden fees, no surprises.",
          zh: "以您的货币清晰定价，安全在线充值——没有隐藏费用，没有意外。",
          ko: "선호 통화로 표시되는 명확한 가격과 안전한 온라인 충전으로 숨은 수수료나 놀라움이 없습니다.",
        },
      },
      {
        title: {
          vi: "Hỗ trợ tận tâm",
          en: "Support that cares",
          zh: "贴心支持",
          ko: "진심을 담은 지원",
        },
        description: {
          vi: "Đội ngũ phản hồi nhanh và cơ chế giải quyết tranh chấp luôn đồng hành cùng mỗi lần đặt lịch.",
          en: "A responsive team and built-in dispute resolution stand behind every booking you make.",
          zh: "响应迅速的团队与内置纠纷解决机制，为您的每次预约保驾护航。",
          ko: "빠르게 대응하는 팀과 내장된 분쟁 해결 절차가 모든 예약을 뒷받침합니다.",
        },
      },
    ],
  },
  features: {
    title: {
      vi: "Tính năng dịch vụ",
      en: "Our Service Features",
      zh: "我们的服务功能",
      ko: "서비스 기능",
    },
    subtitle: {
      vi: "Mọi thứ bạn cần để tìm, đặt và quản lý dịch vụ — đơn giản một cách tinh tế.",
      en: "Everything you need to find, book and manage services — beautifully simple.",
      zh: "查找、预约与管理服务所需的一切——简约而精致。",
      ko: "서비스를 찾고 예약하고 관리하는 데 필요한 모든 것을 아름답고 간단하게 제공합니다.",
    },
    items: [
      {
        title: {
          vi: "Đặt lịch dễ dàng",
          en: "Easy booking",
          zh: "轻松预约",
          ko: "간편한 예약",
        },
        description: {
          vi: "Xem lịch trống và đặt người bạn ưng ý chỉ trong vài thao tác.",
          en: "Browse availability and book your preferred provider in just a few taps.",
          zh: "浏览空档，只需几下点击即可预约心仪的服务提供者。",
          ko: "가능 시간을 확인하고 원하는 제공자를 몇 번의 탭으로 예약하세요.",
        },
      },
      {
        title: {
          vi: "Trò chuyện thời gian thực",
          en: "Real-time chat",
          zh: "实时聊天",
          ko: "실시간 채팅",
        },
        description: {
          vi: "Nhắn tin tức thì để trao đổi chi tiết trước và sau khi đặt lịch.",
          en: "Message providers instantly to align on details before and after your booking.",
          zh: "即时联系服务提供者，在预约前后确认细节。",
          ko: "예약 전후로 제공자에게 즉시 메시지를 보내 세부 사항을 조율하세요.",
        },
      },
      {
        title: {
          vi: "Đánh giá & nhận xét",
          en: "Ratings & reviews",
          zh: "评分与评价",
          ko: "평점 및 리뷰",
        },
        description: {
          vi: "Quyết định sáng suốt nhờ phản hồi trung thực từ cộng đồng.",
          en: "Make informed choices with honest feedback from the community.",
          zh: "凭借社区的真实反馈做出明智选择。",
          ko: "커뮤니티의 솔직한 피드백을 바탕으로 더 나은 선택을 하세요.",
        },
      },
      {
        title: {
          vi: "Ví an toàn",
          en: "Secure wallet",
          zh: "安全钱包",
          ko: "안전한 지갑",
        },
        description: {
          vi: "Nạp và thanh toán an toàn với ví đa tiền tệ tiện lợi.",
          en: "Top up and pay securely with a multi-currency wallet built for convenience.",
          zh: "通过便捷的多币种钱包安全充值与付款。",
          ko: "편의를 위해 설계된 다중 통화 지갑으로 안전하게 충전하고 결제하세요.",
        },
      },
      {
        title: {
          vi: "Thông báo thông minh",
          en: "Smart notifications",
          zh: "智能通知",
          ko: "스마트 알림",
        },
        description: {
          vi: "Nắm bắt lịch hẹn, lời nhắc và tin nhắn với cảnh báo kịp thời.",
          en: "Stay on top of bookings, reminders and messages with timely alerts.",
          zh: "通过及时提醒掌握预约、提醒与消息。",
          ko: "적시에 도착하는 알림으로 예약, 리마인더, 메시지를 놓치지 마세요.",
        },
      },
      {
        title: {
          vi: "Đa ngôn ngữ",
          en: "Multi-language",
          zh: "多语言",
          ko: "다국어 지원",
        },
        description: {
          vi: "Trải nghiệm PR1AS bằng tiếng Anh, tiếng Việt và tiếng Trung — ở bất cứ đâu.",
          en: "Enjoy PR1AS in English, Vietnamese and Chinese — wherever you are.",
          zh: "以英语、越南语和中文体验 PR1AS——无论您身在何处。",
          ko: "어디서든 영어, 베트남어, 중국어, 한국어로 PR1AS를 이용하세요.",
        },
      },
    ],
  },
  cta: {
    title: {
      vi: "Sẵn sàng bắt đầu?",
      en: "Ready to get started?",
      zh: "准备好开始了吗？",
      ko: "시작할 준비가 되셨나요?",
    },
    subtitle: {
      vi: "Khám phá cộng đồng và tìm người cung cấp dịch vụ phù hợp với bạn ngay hôm nay.",
      en: "Explore the community and find the right service provider for you today.",
      zh: "立即探索社区，找到适合您的服务提供者。",
      ko: "오늘 커뮤니티를 둘러보고 나에게 맞는 서비스 제공자를 찾아보세요.",
    },
    primary: {
      vi: "Khám phá ngay",
      en: "Explore now",
      zh: "立即探索",
      ko: "지금 둘러보기",
    },
    secondary: {
      vi: "Xem bảng giá",
      en: "View pricing",
      zh: "查看价格",
      ko: "요금제 보기",
    },
  },
};
