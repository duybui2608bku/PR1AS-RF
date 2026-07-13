export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  PENDING_CLIENT_ACCEPTANCE = "pending_client_acceptance",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  DISPUTED = "disputed",
  EXPIRED = "expired",
}

export const BOOKING_SCHEDULE_BLOCKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.PENDING_CLIENT_ACCEPTANCE,
];

// Worker đã bấm bắt đầu → có bằng chứng buổi hẹn thực sự diễn ra. Quá giờ kết thúc
// mà không ai bấm tiếp thì gần như chắc chắn là "làm xong rồi quên cập nhật".
export const BOOKING_AUTO_COMPLETE_STARTED_STATUSES: BookingStatus[] = [
  BookingStatus.IN_PROGRESS,
  BookingStatus.PENDING_CLIENT_ACCEPTANCE,
];

// Booking còn "đang chạy" sau khi lịch hẹn đã kết thúc: hai bên làm xong ngoài đời
// nhưng quên bấm status. Job auto-complete quét đúng các trạng thái này — CONFIRMED
// với grace dài hơn (xem BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS).
// DISPUTED cố tình không nằm trong đây — đang tranh chấp thì chờ admin phân xử.
export const BOOKING_AUTO_COMPLETE_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  ...BOOKING_AUTO_COMPLETE_STARTED_STATUSES,
];

export enum CancellationReason {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
  POLICY_VIOLATION = "policy_violation",
  OTHER = "other",
}

export enum CancelledBy {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
  SYSTEM = "system",
}

export enum DisputeReason {
  SERVICE_NOT_AS_DESCRIBED = "service_not_as_described",
  WORKER_NO_SHOW = "worker_no_show",
  POOR_QUALITY = "poor_quality",
  INCOMPLETE_SERVICE = "incomplete_service",
  UNPROFESSIONAL_BEHAVIOR = "unprofessional_behavior",
  SAFETY_CONCERN = "safety_concern",
  OTHER = "other",
}

export enum DisputeResolution {
  FAVOR_CLIENT = "favor_client",
  FAVOR_WORKER = "favor_worker",
}

export const BOOKING_STATUS_TRANSITIONS: Record<
  BookingStatus,
  BookingStatus[]
> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  // Khi đã IN_PROGRESS, không cho cancel đơn phương để tránh tranh chấp khó xử
  // (worker đã làm dở, client phủi tay → ai chịu chi phí?). Mọi vấn đề
  // phát sinh trong lúc thực hiện phải đi qua DISPUTED để admin phân xử.
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.PENDING_CLIENT_ACCEPTANCE,
    BookingStatus.DISPUTED,
  ],
  [BookingStatus.PENDING_CLIENT_ACCEPTANCE]: [
    BookingStatus.COMPLETED,
    BookingStatus.DISPUTED,
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.DISPUTED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.EXPIRED]: [],
};

export const BOOKING_LIMITS = {
  MIN_ADVANCE_HOURS: 2,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_FREE_HOURS: 24,
  MAX_DURATION_HOURS: 24,
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_DAYS: 30,
  MAX_DURATION_MONTHS: 12,
  AUTO_CONFIRM_HOURS: 24,
  // Grace sau schedule.end_time trước khi job tự set COMPLETED.
  // Booking đã bắt đầu (IN_PROGRESS/PENDING_CLIENT_ACCEPTANCE): 2 giờ là đủ.
  AUTO_COMPLETE_HOURS: 2,
  // Booking mới chỉ CONFIRMED thì hệ thống không có bằng chứng buổi hẹn đã diễn ra
  // (có thể worker no-show). Chờ hết cửa sổ khiếu nại rồi mới coi như xong, để hai
  // bên còn kịp cancel/dispute. Cố ý bằng DISPUTE_WINDOW_DAYS.
  AUTO_COMPLETE_UNSTARTED_DAYS: 3,
  // Sau khi lịch hẹn kết thúc, client chỉ còn 3 ngày để mở khiếu nại với
  // booking đã COMPLETED. Quá hạn coi như chấp nhận kết quả, không thể tranh chấp.
  DISPUTE_WINDOW_DAYS: 3,
  CONFIRM_DEADLINE_BEFORE_START_HOURS: 6,
  SHORT_NOTICE_CONFIRM_MINUTES: 60,
} as const;
