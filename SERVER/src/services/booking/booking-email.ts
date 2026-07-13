import { config } from "../../config";
import { BookingStatus } from "../../constants/booking";
import { NotificationChannel } from "../../constants/notification";
import { notificationRepository } from "../../repositories/notification";
import { userRepository } from "../../repositories/auth/user.repository";
import type { IBookingDocument } from "../../types/booking";
import { Locale } from "../../utils/i18n";
import nodemailerUtils from "../../utils/nodemailer";
import {
  bookingGuestRequestTemplate,
  bookingGuestStatusTemplate,
  bookingWorkerRequestTemplate,
} from "../../utils/template-mail";

const LOCALES: Locale[] = ["en", "vi", "ko", "zh"];

const INTL_LOCALE_MAP: Record<Locale, string> = {
  en: "en-US",
  vi: "vi-VN",
  ko: "ko-KR",
  zh: "zh-CN",
};

const STATUS_LABELS: Record<BookingStatus, Record<Locale, string>> = {
  [BookingStatus.PENDING]: {
    en: "pending",
    vi: "chờ xác nhận",
    ko: "대기",
    zh: "待确认",
  },
  [BookingStatus.CONFIRMED]: {
    en: "confirmed",
    vi: "đã xác nhận",
    ko: "확인됨",
    zh: "已确认",
  },
  [BookingStatus.IN_PROGRESS]: {
    en: "in progress",
    vi: "đang thực hiện",
    ko: "진행 중",
    zh: "进行中",
  },
  [BookingStatus.PENDING_CLIENT_ACCEPTANCE]: {
    en: "awaiting your acceptance",
    vi: "đang chờ bạn xác nhận",
    ko: "고객 확인 대기",
    zh: "等待客户确认",
  },
  [BookingStatus.COMPLETED]: {
    en: "completed",
    vi: "đã hoàn thành",
    ko: "완료",
    zh: "已完成",
  },
  [BookingStatus.CANCELLED]: {
    en: "cancelled",
    vi: "đã hủy",
    ko: "취소됨",
    zh: "已取消",
  },
  [BookingStatus.REJECTED]: {
    en: "rejected",
    vi: "đã từ chối",
    ko: "거절됨",
    zh: "已拒绝",
  },
  [BookingStatus.DISPUTED]: {
    en: "disputed",
    vi: "đang tranh chấp",
    ko: "분쟁 중",
    zh: "有争议",
  },
  [BookingStatus.EXPIRED]: {
    en: "expired",
    vi: "đã hết hạn",
    ko: "만료됨",
    zh: "已过期",
  },
};

function resolveLocale(raw: unknown, fallback: Locale = "en"): Locale {
  if (typeof raw === "string" && LOCALES.includes(raw as Locale)) {
    return raw as Locale;
  }
  return fallback;
}

function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_MAP[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function toId(value: unknown): string {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function getServiceName(booking: IBookingDocument, locale: Locale): string {
  const service = booking.service_id;
  if (service && typeof service === "object") {
    const name = (service as { name?: Record<string, string>; code?: string })
      .name;
    if (name) {
      return (
        name[locale] ||
        name.en ||
        name.vi ||
        (service as { code?: string }).code ||
        booking.service_code
      );
    }
  }
  return booking.service_code;
}

function getWorkerName(booking: IBookingDocument): string {
  const worker = booking.worker_id as unknown as {
    full_name?: string;
    email?: string;
  };
  return worker?.full_name || worker?.email || "Worker";
}

function getGuestName(booking: IBookingDocument): string {
  return booking.guest_contact?.name?.trim() || "Guest";
}

function getGuestLocale(
  booking: IBookingDocument,
  fallback: Locale = "en"
): Locale {
  return resolveLocale(booking.guest_locale, fallback);
}

function buildTrackingLink(booking: IBookingDocument): string {
  const code = booking.public_ref || toId(booking._id);
  const email = booking.guest_contact?.email?.trim().toLowerCase() || "";
  const url = new URL("/booking-lookup", config.frontendUrl);
  url.searchParams.set("code", code);
  if (email) url.searchParams.set("email", email);
  return url.toString();
}

export async function sendQuickBookingCreatedEmails(
  booking: IBookingDocument
): Promise<void> {
  if (!booking.is_guest || !booking.guest_contact?.email) return;

  const locale = getGuestLocale(booking);
  const trackingLink = buildTrackingLink(booking);
  const workerName = getWorkerName(booking);
  const serviceName = getServiceName(booking, locale);
  const startTime = formatDateTime(
    new Date(booking.schedule.start_time),
    locale
  );
  const endTime = formatDateTime(new Date(booking.schedule.end_time), locale);
  const guestTemplate = bookingGuestRequestTemplate({
    locale,
    guestName: getGuestName(booking),
    bookingRef: booking.public_ref || toId(booking._id),
    trackingLink,
    workerName,
    serviceName,
    startTime,
    endTime,
  });

  await nodemailerUtils({
    email: booking.guest_contact.email,
    subject: guestTemplate.subject,
    html: guestTemplate.html,
  });

  const workerId = toId(booking.worker_id);
  const worker = await userRepository.findById(workerId);
  if (!worker?.email) return;

  const preference =
    await notificationRepository.getOrCreatePreference(workerId);
  if (preference.channels[NotificationChannel.EMAIL] !== false) {
    return;
  }

  const workerLocale = resolveLocale(worker.meta_data?.locale, "en");
  const workerTemplate = bookingWorkerRequestTemplate({
    locale: workerLocale,
    workerName: worker.full_name || worker.email,
    bookingRef: booking.public_ref || toId(booking._id),
    clientName: getGuestName(booking),
    clientEmail: booking.guest_contact.email,
    clientPhone: booking.guest_contact.phone,
    serviceName: getServiceName(booking, workerLocale),
    startTime: formatDateTime(
      new Date(booking.schedule.start_time),
      workerLocale
    ),
    endTime: formatDateTime(new Date(booking.schedule.end_time), workerLocale),
    bookingLink: `${config.frontendUrl}/worker/bookings`,
  });
  await nodemailerUtils({
    email: worker.email,
    subject: workerTemplate.subject,
    html: workerTemplate.html,
  });
}

export async function sendQuickBookingStatusEmail(
  booking: IBookingDocument,
  status: BookingStatus
): Promise<void> {
  if (!booking.is_guest || !booking.guest_contact?.email) return;
  if (status === BookingStatus.PENDING) return;

  const locale = getGuestLocale(booking);
  const trackingLink = buildTrackingLink(booking);
  const serviceName = getServiceName(booking, locale);
  const workerName = getWorkerName(booking);
  const startTime = formatDateTime(
    new Date(booking.schedule.start_time),
    locale
  );
  const endTime = formatDateTime(new Date(booking.schedule.end_time), locale);
  const statusLabel = STATUS_LABELS[status][locale] || STATUS_LABELS[status].en;

  const template = bookingGuestStatusTemplate({
    locale,
    guestName: getGuestName(booking),
    bookingRef: booking.public_ref || toId(booking._id),
    trackingLink,
    workerName,
    serviceName,
    startTime,
    endTime,
    status: statusLabel,
    workerResponse: booking.worker_response,
  });

  await nodemailerUtils({
    email: booking.guest_contact.email,
    subject: template.subject,
    html: template.html,
  });
}
