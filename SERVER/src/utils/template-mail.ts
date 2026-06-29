import { APP_CONSTANTS } from "../constants/app";
import { TOKEN_EXPIRY } from "../constants/time";
import { Locale, t } from "./i18n";

export interface EmailTemplate {
  subject: string;
  html: string;
}

type BookingEmailKey =
  | "subject.guestRequest"
  | "subject.guestStatus"
  | "subject.workerRequest"
  | "guestRequest.heading"
  | "guestRequest.greeting"
  | "guestRequest.body"
  | "guestRequest.codeLabel"
  | "guestRequest.workerLabel"
  | "guestRequest.serviceLabel"
  | "guestRequest.timeLabel"
  | "guestRequest.button"
  | "guestRequest.pasteLink"
  | "guestRequest.footer"
  | "guestStatus.heading"
  | "guestStatus.greeting"
  | "guestStatus.body"
  | "guestStatus.codeLabel"
  | "guestStatus.workerLabel"
  | "guestStatus.serviceLabel"
  | "guestStatus.timeLabel"
  | "guestStatus.workerResponseLabel"
  | "guestStatus.button"
  | "guestStatus.pasteLink"
  | "guestStatus.footer"
  | "workerRequest.heading"
  | "workerRequest.body"
  | "workerRequest.codeLabel"
  | "workerRequest.clientLabel"
  | "workerRequest.contactLabel"
  | "workerRequest.serviceLabel"
  | "workerRequest.timeLabel"
  | "workerRequest.button"
  | "workerRequest.footer"
  | "status.pending"
  | "status.confirmed"
  | "status.inProgress"
  | "status.pendingClientAcceptance"
  | "status.completed"
  | "status.cancelled"
  | "status.rejected"
  | "status.disputed"
  | "status.expired";

const BOOKING_EMAIL_COPY: Record<BookingEmailKey, Record<Locale, string>> = {
  "subject.guestRequest": {
    en: "{appName} quick booking received",
    vi: "{appName} - Đã nhận quick booking",
    ko: "{appName} 빠른 예약 접수",
    zh: "{appName} 已收到快速预约",
  },
  "subject.guestStatus": {
    en: "{appName} booking {status}",
    vi: "{appName} - booking đã {status}",
    ko: "{appName} 예약 {status}",
    zh: "{appName} 预约已{status}",
  },
  "subject.workerRequest": {
    en: "{appName} new booking from {bookingRef}",
    vi: "{appName} - Booking mới từ {bookingRef}",
    ko: "{appName} {bookingRef}에서 새 예약",
    zh: "{appName} 来自 {bookingRef} 的新预约",
  },
  "guestRequest.heading": {
    en: "Your booking request has been received",
    vi: "Yêu cầu booking của bạn đã được ghi nhận",
    ko: "예약 요청이 접수되었습니다",
    zh: "您的预约请求已收到",
  },
  "guestRequest.greeting": {
    en: "Hello {name},",
    vi: "Xin chào {name},",
    ko: "안녕하세요 {name}님,",
    zh: "您好 {name}，",
  },
  "guestRequest.body": {
    en: "We have sent your quick booking request to the worker. You can use the tracking link below anytime to check the status.",
    vi: "Chúng tôi đã gửi yêu cầu quick booking của bạn tới worker. Bạn có thể dùng liên kết tra cứu bên dưới bất cứ lúc nào để kiểm tra trạng thái.",
    ko: "우리는 빠른 예약 요청을 워커에게 보냈습니다. 아래 추적 링크로 언제든지 상태를 확인할 수 있습니다.",
    zh: "我们已将您的快速预约请求发送给服务人员。您可以随时使用下方查询链接查看状态。",
  },
  "guestRequest.codeLabel": {
    en: "Tracking code:",
    vi: "Mã tra cứu:",
    ko: "추적 코드:",
    zh: "查询码：",
  },
  "guestRequest.workerLabel": {
    en: "Worker:",
    vi: "Worker:",
    ko: "워커:",
    zh: "服务人员：",
  },
  "guestRequest.serviceLabel": {
    en: "Service:",
    vi: "Dịch vụ:",
    ko: "서비스:",
    zh: "服务：",
  },
  "guestRequest.timeLabel": {
    en: "Schedule:",
    vi: "Lịch hẹn:",
    ko: "일정:",
    zh: "时间：",
  },
  "guestRequest.button": {
    en: "Open booking lookup",
    vi: "Mở trang tra cứu booking",
    ko: "예약 조회 열기",
    zh: "打开预约查询",
  },
  "guestRequest.pasteLink": {
    en: "Or paste this link into your browser:",
    vi: "Hoặc dán liên kết này vào trình duyệt của bạn:",
    ko: "또는 이 링크를 브라우저에 붙여넣으세요:",
    zh: "或者将此链接复制到浏览器中：",
  },
  "guestRequest.footer": {
    en: "Thanks for using {appName}.",
    vi: "Cảm ơn bạn đã sử dụng {appName}.",
    ko: "{appName}를 이용해 주셔서 감사합니다.",
    zh: "感谢您使用 {appName}。",
  },
  "guestStatus.heading": {
    en: "Your booking status has changed",
    vi: "Trạng thái booking của bạn đã thay đổi",
    ko: "예약 상태가 변경되었습니다",
    zh: "您的预约状态已更新",
  },
  "guestStatus.greeting": {
    en: "Hello {name},",
    vi: "Xin chào {name},",
    ko: "안녕하세요 {name}님,",
    zh: "您好 {name}，",
  },
  "guestStatus.body": {
    en: "Your booking is now marked as {status}. You can open the tracking link below to review the details at any time.",
    vi: "Booking của bạn hiện được đánh dấu là {status}. Bạn có thể mở liên kết tra cứu bên dưới để xem lại chi tiết bất cứ lúc nào.",
    ko: "예약이 {status} 상태로 표시되었습니다. 아래 추적 링크로 언제든지 세부 내용을 확인할 수 있습니다.",
    zh: "您的预约已标记为 {status}。您可以随时打开下方查询链接查看详情。",
  },
  "guestStatus.codeLabel": {
    en: "Tracking code:",
    vi: "Mã tra cứu:",
    ko: "추적 코드:",
    zh: "查询码：",
  },
  "guestStatus.workerLabel": {
    en: "Worker:",
    vi: "Worker:",
    ko: "워커:",
    zh: "服务人员：",
  },
  "guestStatus.serviceLabel": {
    en: "Service:",
    vi: "Dịch vụ:",
    ko: "서비스:",
    zh: "服务：",
  },
  "guestStatus.timeLabel": {
    en: "Schedule:",
    vi: "Lịch hẹn:",
    ko: "일정:",
    zh: "时间：",
  },
  "guestStatus.workerResponseLabel": {
    en: "Message from the worker:",
    vi: "Phản hồi từ người thực hiện:",
    ko: "작업자의 메시지:",
    zh: "服务者的留言：",
  },
  "guestStatus.button": {
    en: "View booking status",
    vi: "Xem trạng thái booking",
    ko: "예약 상태 보기",
    zh: "查看预约状态",
  },
  "guestStatus.pasteLink": {
    en: "Or paste this link into your browser:",
    vi: "Hoặc dán liên kết này vào trình duyệt của bạn:",
    ko: "또는 이 링크를 브라우저에 붙여넣으세요:",
    zh: "或者将此链接复制到浏览器中：",
  },
  "guestStatus.footer": {
    en: "Thanks for using {appName}.",
    vi: "Cảm ơn bạn đã sử dụng {appName}.",
    ko: "{appName}를 이용해 주셔서 감사합니다.",
    zh: "感谢您使用 {appName}。",
  },
  "workerRequest.heading": {
    en: "New quick booking request",
    vi: "Có quick booking mới",
    ko: "새 예약 요청",
    zh: "新的快速预约请求",
  },
  "workerRequest.body": {
    en: "Hello {name}, you have received a new booking request on {appName}. Please review and respond as soon as possible.",
    vi: "Xin chào {name}, bạn vừa nhận được một yêu cầu booking mới trên {appName}. Vui lòng xem xét và phản hồi sớm nhất có thể.",
    ko: "안녕하세요 {name}님, {appName}에서 새 예약 요청이 있습니다. 가능한 한 빨리 확인해 주세요.",
    zh: "您好 {name}，您在 {appName} 收到了一条新的预约请求。请尽快查看并回复。",
  },
  "workerRequest.codeLabel": {
    en: "Tracking code:",
    vi: "Mã tra cứu:",
    ko: "추적 코드:",
    zh: "查询码：",
  },
  "workerRequest.clientLabel": {
    en: "Guest:",
    vi: "Khách:",
    ko: "고객:",
    zh: "客户：",
  },
  "workerRequest.contactLabel": {
    en: "Contact:",
    vi: "Liên hệ:",
    ko: "연락처:",
    zh: "联系方式：",
  },
  "workerRequest.serviceLabel": {
    en: "Service:",
    vi: "Dịch vụ:",
    ko: "서비스:",
    zh: "服务：",
  },
  "workerRequest.timeLabel": {
    en: "Schedule:",
    vi: "Lịch hẹn:",
    ko: "일정:",
    zh: "时间：",
  },
  "workerRequest.button": {
    en: "Open worker bookings",
    vi: "Mở trang booking công việc",
    ko: "워커 예약 열기",
    zh: "打开工作者预约页",
  },
  "workerRequest.footer": {
    en: "Manage your booking requests in {appName}.",
    vi: "Quản lý yêu cầu booking của bạn trong {appName}.",
    ko: "{appName}에서 예약 요청을 관리하세요.",
    zh: "请在 {appName} 中管理您的预约请求。",
  },
  "status.pending": {
    en: "pending",
    vi: "chờ xác nhận",
    ko: "대기",
    zh: "待确认",
  },
  "status.confirmed": {
    en: "confirmed",
    vi: "đã xác nhận",
    ko: "확인됨",
    zh: "已确认",
  },
  "status.inProgress": {
    en: "in progress",
    vi: "đang thực hiện",
    ko: "진행 중",
    zh: "进行中",
  },
  "status.pendingClientAcceptance": {
    en: "awaiting your acceptance",
    vi: "đang chờ bạn xác nhận",
    ko: "고객 확인 대기",
    zh: "等待客户确认",
  },
  "status.completed": {
    en: "completed",
    vi: "đã hoàn thành",
    ko: "완료",
    zh: "已完成",
  },
  "status.cancelled": {
    en: "cancelled",
    vi: "đã hủy",
    ko: "취소됨",
    zh: "已取消",
  },
  "status.rejected": {
    en: "rejected",
    vi: "đã từ chối",
    ko: "거절됨",
    zh: "已拒绝",
  },
  "status.disputed": {
    en: "disputed",
    vi: "đang tranh chấp",
    ko: "분쟁 중",
    zh: "有争议",
  },
  "status.expired": {
    en: "expired",
    vi: "đã hết hạn",
    ko: "만료됨",
    zh: "已过期",
  },
};

function bookingEmailText(
  key: BookingEmailKey,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  let result = BOOKING_EMAIL_COPY[key][locale] || BOOKING_EMAIL_COPY[key].en;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return result;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const safe = (value: string | number | null | undefined): string =>
  escapeHtml(value == null ? "" : String(value));

const bookingPanelStyle =
  "background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:24px;box-shadow:0 12px 30px rgba(15,23,42,0.08);";

const bookingLabelStyle =
  "display:block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;";

const bookingValueStyle =
  "font-size:15px;font-weight:600;color:#111827;margin:0;";

const bookingMetaPillStyle =
  "display:inline-block;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:0.04em;background:#ecfeff;color:#0f766e;";

const bookingMutedTextStyle =
  "color:#6b7280;font-size:13px;line-height:1.6;margin:0;";

function bookingActionButton(
  href: string,
  label: string,
  color = "#0f766e"
): string {
  return `
    <div style="text-align:center;margin:28px 0 16px;">
      <a href="${safe(href)}" style="background:${color};color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:999px;display:inline-block;font-weight:700;box-shadow:0 10px 24px rgba(15,118,110,0.18);">${safe(label)}</a>
    </div>
  `;
}

function bookingSummaryRow(label: string, value: string): string {
  return `
    <div style="min-width:0;">
      <span style="${bookingLabelStyle}">${safe(label)}</span>
      <p style="${bookingValueStyle}">${safe(value)}</p>
    </div>
  `;
}

function bookingEmailFrame(input: {
  title: string;
  heading: string;
  intro: string;
  accent: string;
  badge?: string;
  body: string;
  cta?: string;
  ctaLabel?: string;
  footer?: string;
}): string {
  const badgeHtml = input.badge
    ? `<div style="margin-bottom:16px;"><span style="${bookingMetaPillStyle};background:${input.accent}15;color:${input.accent};">${safe(input.badge)}</span></div>`
    : "";
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safe(input.title)}</title>
    </head>
    <body style="margin:0;background:#f3f4f6;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;">
        <div style="background:linear-gradient(135deg, ${input.accent} 0%, #0f172a 100%);border-radius:24px 24px 0 0;padding:28px 28px 22px;color:#fff;">
          <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.75;font-weight:700;">PR1AS</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;">${safe(input.heading)}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;opacity:0.92;">${safe(input.intro)}</p>
        </div>
        <div style="background:#ffffff;border-radius:0 0 24px 24px;padding:24px 24px 28px;border:1px solid #e5e7eb;border-top:none;">
          ${badgeHtml}
          ${input.body}
          ${input.cta && input.ctaLabel ? bookingActionButton(input.cta, input.ctaLabel) : ""}
          ${input.footer ? `<p style="${bookingMutedTextStyle};margin-top:20px;">${safe(input.footer)}</p>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
}

export const emailVerificationTemplate = (
  verificationLink: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const subject = t("email.subject.emailVerification", locale, { appName });
  const heading = t("email.verification.heading", locale);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${t("email.verification.body", locale, { appName })}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">${t("email.verification.button", locale)}</a>
        </div>
        <p>${t("email.verification.pasteLink", locale)}</p>
        <p style="word-break: break-all; color: #007bff;">${verificationLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">${t("email.verification.expiry", locale, { hours: TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS })}</p>
        <p style="color: #666; font-size: 12px;">${t("email.verification.notCreated", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const passwordResetTemplate = (
  resetLink: string,
  userName?: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const greeting = userName
    ? t("email.passwordReset.greeting.named", locale, { name: userName })
    : t("email.passwordReset.greeting.anonymous", locale);
  const subject = t("email.subject.passwordReset", locale, { appName });
  const heading = t("email.passwordReset.heading", locale);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${greeting}</p>
        <p>${t("email.passwordReset.body", locale)}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">${t("email.passwordReset.button", locale)}</a>
        </div>
        <p>${t("email.passwordReset.pasteLink", locale)}</p>
        <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;"><strong>${t("email.passwordReset.expiry", locale, { minutes: TOKEN_EXPIRY.PASSWORD_RESET_MINUTES })}</strong></p>
        <p style="color: #666; font-size: 12px;">${t("email.passwordReset.notRequested", locale)}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">${t("email.passwordReset.securityNote", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const passwordChangedTemplate = (
  userName?: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const greeting = userName
    ? t("email.passwordChanged.greeting.named", locale, { name: userName })
    : t("email.passwordChanged.greeting.anonymous", locale);
  const subject = t("email.subject.passwordChanged", locale, { appName });
  const heading = t("email.passwordChanged.heading", locale);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${greeting}</p>
        <p>${t("email.passwordChanged.body", locale, { appName })}</p>
        <p style="color: #b91c1c; font-weight: bold; margin-top: 20px;">${t("email.passwordChanged.notYou", locale)}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">${t("email.passwordChanged.footer", locale, { appName })}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const accountBannedTemplate = (
  adminEmail: string,
  userName?: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const greeting = userName
    ? t("email.banned.greeting.named", locale, { name: userName })
    : t("email.banned.greeting.anonymous", locale);
  const adminEmailLink = `<a href="mailto:${adminEmail}" style="color: #007bff;">${adminEmail}</a>`;
  const subject = t("email.subject.accountBanned", locale, { appName });
  const heading = t("email.banned.heading", locale, { appName });
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${greeting}</p>
        <p>${t("email.banned.contact", locale, { appName, adminEmailLink })}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">${t("email.banned.footer", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const bookingGuestRequestTemplate = (input: {
  locale: Locale;
  guestName: string;
  bookingRef: string;
  trackingLink: string;
  workerName: string;
  serviceName: string;
  startTime: string;
  endTime: string;
}): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const subject = bookingEmailText("subject.guestRequest", input.locale, {
    appName,
    bookingRef: input.bookingRef,
  });
  const heading = bookingEmailText("guestRequest.heading", input.locale);
  const html = bookingEmailFrame({
    title: heading,
    heading,
    intro: bookingEmailText("guestRequest.greeting", input.locale, {
      name: input.guestName,
      appName,
    }),
    accent: "#0f766e",
    badge: bookingEmailText("guestRequest.button", input.locale),
    body: `
      <p style="${bookingMutedTextStyle};margin-bottom:18px;">${safe(
        bookingEmailText("guestRequest.body", input.locale)
      )}</p>
      <div style="${bookingPanelStyle}">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
          ${bookingSummaryRow(
            bookingEmailText("guestRequest.codeLabel", input.locale),
            input.bookingRef
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestRequest.workerLabel", input.locale),
            input.workerName
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestRequest.serviceLabel", input.locale),
            input.serviceName
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestRequest.timeLabel", input.locale),
            `${input.startTime} - ${input.endTime}`
          )}
        </div>
      </div>
      <p style="${bookingMutedTextStyle};margin-top:18px;">${safe(
        bookingEmailText("guestRequest.pasteLink", input.locale)
      )}</p>
      <p style="word-break:break-all;color:#0f766e;font-size:13px;font-weight:700;margin-top:6px;">${safe(
        input.trackingLink
      )}</p>
    `,
    cta: input.trackingLink,
    ctaLabel: bookingEmailText("guestRequest.button", input.locale),
    footer: bookingEmailText("guestRequest.footer", input.locale, { appName }),
  });
  return { subject, html };
};

export const bookingGuestStatusTemplate = (input: {
  locale: Locale;
  guestName: string;
  bookingRef: string;
  trackingLink: string;
  workerName: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: string;
  workerResponse?: string;
}): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const workerResponse = input.workerResponse?.trim();
  const subject = bookingEmailText("subject.guestStatus", input.locale, {
    appName,
    status: input.status,
    bookingRef: input.bookingRef,
  });
  const heading = bookingEmailText("guestStatus.heading", input.locale);
  const html = bookingEmailFrame({
    title: heading,
    heading,
    intro: bookingEmailText("guestStatus.greeting", input.locale, {
      name: input.guestName,
      appName,
    }),
    accent: "#2563eb",
    badge: input.status,
    body: `
      <p style="${bookingMutedTextStyle};margin-bottom:18px;">${safe(
        bookingEmailText("guestStatus.body", input.locale, {
          status: input.status,
        })
      )}</p>
      <div style="${bookingPanelStyle}">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
          ${bookingSummaryRow(
            bookingEmailText("guestStatus.codeLabel", input.locale),
            input.bookingRef
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestStatus.workerLabel", input.locale),
            input.workerName
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestStatus.serviceLabel", input.locale),
            input.serviceName
          )}
          ${bookingSummaryRow(
            bookingEmailText("guestStatus.timeLabel", input.locale),
            `${input.startTime} - ${input.endTime}`
          )}
        </div>
      </div>
      ${
        workerResponse
          ? `<div style="${bookingPanelStyle};margin-top:18px;">
        <span style="${bookingLabelStyle}">${safe(
          bookingEmailText("guestStatus.workerResponseLabel", input.locale)
        )}</span>
        <p style="${bookingValueStyle};font-weight:500;white-space:pre-line;">${safe(
          workerResponse
        ).replace(/\n/g, "<br>")}</p>
      </div>`
          : ""
      }
      <p style="${bookingMutedTextStyle};margin-top:18px;">${safe(
        bookingEmailText("guestStatus.pasteLink", input.locale)
      )}</p>
      <p style="word-break:break-all;color:#2563eb;font-size:13px;font-weight:700;margin-top:6px;">${safe(
        input.trackingLink
      )}</p>
    `,
    cta: input.trackingLink,
    ctaLabel: bookingEmailText("guestStatus.button", input.locale),
    footer: bookingEmailText("guestStatus.footer", input.locale, { appName }),
  });
  return { subject, html };
};

export const bookingWorkerRequestTemplate = (input: {
  locale: Locale;
  workerName: string;
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  serviceName: string;
  startTime: string;
  endTime: string;
  bookingLink: string;
}): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const subject = bookingEmailText("subject.workerRequest", input.locale, {
    appName,
    bookingRef: input.bookingRef,
  });
  const heading = bookingEmailText("workerRequest.heading", input.locale);
  const html = bookingEmailFrame({
    title: heading,
    heading,
    intro: bookingEmailText("workerRequest.body", input.locale, {
      name: input.workerName,
      appName,
    }),
    accent: "#0f766e",
    badge: bookingEmailText("workerRequest.button", input.locale),
    body: `
      <div style="${bookingPanelStyle}">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
          ${bookingSummaryRow(
            bookingEmailText("workerRequest.codeLabel", input.locale),
            input.bookingRef
          )}
          ${bookingSummaryRow(
            bookingEmailText("workerRequest.clientLabel", input.locale),
            input.clientName
          )}
          ${bookingSummaryRow(
            bookingEmailText("workerRequest.contactLabel", input.locale),
            `${input.clientEmail}${input.clientPhone ? ` · ${input.clientPhone}` : ""}`
          )}
          ${bookingSummaryRow(
            bookingEmailText("workerRequest.serviceLabel", input.locale),
            input.serviceName
          )}
          ${bookingSummaryRow(
            bookingEmailText("workerRequest.timeLabel", input.locale),
            `${input.startTime} - ${input.endTime}`
          )}
        </div>
      </div>
    `,
    cta: input.bookingLink,
    ctaLabel: bookingEmailText("workerRequest.button", input.locale),
    footer: bookingEmailText("workerRequest.footer", input.locale, { appName }),
  });
  return { subject, html };
};
