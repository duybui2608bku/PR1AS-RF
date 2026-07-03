import type { ContactContentData, LocalizedText } from "../types/contact";

export const CONTACT_MESSAGES = {
  FETCHED: "Contact content fetched successfully",
  UPDATED: "Contact content updated successfully",
  RESET: "Contact content reset to defaults",
} as const;

const t = (vi: string, en: string, zh: string, ko: string): LocalizedText => ({
  vi,
  en,
  zh,
  ko,
});

/**
 * Factory default content for the public Contact page. Seeds the singleton on
 * first access and is the target for the admin "reset" action.
 */
export const CONTACT_DEFAULTS: ContactContentData = {
  title: t("Liên hệ", "Contact", "联系我们", "문의하기"),
  subtitle: t(
    "Bạn có câu hỏi hoặc cần hỗ trợ? Hãy liên hệ với đội ngũ PR1AS — chúng tôi luôn sẵn sàng giúp đỡ.",
    "Have a question or need support? Get in touch with the PR1AS team — we're always happy to help.",
    "有疑问或需要帮助？请联系 PR1AS 团队——我们随时乐意为您服务。",
    "궁금한 점이 있거나 지원이 필요하신가요? PR1AS 팀에 문의하세요 — 언제든 기꺼이 도와드리겠습니다."
  ),
  email: "pr1as.connect@gmail.com",
  phone: "",
  address: { vi: "", en: "", zh: "", ko: "" },
  hours: t(
    "Thứ Hai – Thứ Sáu, 9:00 – 18:00",
    "Monday – Friday, 9:00 AM – 6:00 PM",
    "周一至周五 9:00 – 18:00",
    "월요일 – 금요일, 오전 9:00 – 오후 6:00"
  ),
  body: t(
    "<p>Gửi email cho chúng tôi và bạn sẽ nhận được phản hồi trong vòng 1–2 ngày làm việc.</p>",
    "<p>Email us and you'll hear back within 1–2 business days.</p>",
    "<p>给我们发送电子邮件，我们将在 1–2 个工作日内回复您。</p>",
    "<p>이메일을 보내주시면 영업일 기준 1~2일 이내에 답변드립니다.</p>"
  ),
};
