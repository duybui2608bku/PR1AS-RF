import { userRepository } from "../../repositories/auth/user.repository";
import {
  BookingStatus,
  CancelledBy,
  DisputeResolution,
} from "../../constants/booking";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "../../constants/notification";
import { ReportReason, RestrictionFeature } from "../../constants/moderation";
import type { IBookingDocument } from "../../types/booking";
import type { IReviewDocument } from "../../types/review";
import { notificationService } from "./notification.service";

const REPORT_REASON_LABELS_VI: Record<ReportReason, string> = {
  [ReportReason.SCAM]: "Lừa đảo",
  [ReportReason.LOW_QUALITY]: "Chất lượng thấp",
  [ReportReason.HARASSMENT]: "Quấy rối",
  [ReportReason.FAKE_PROFILE]: "Hồ sơ giả mạo",
  [ReportReason.OTHER]: "Khác",
};

const RESTRICTION_FEATURE_LABELS_VI: Record<RestrictionFeature, string> = {
  [RestrictionFeature.POST_CREATE]: "đăng bài",
  [RestrictionFeature.WORKER_ACTIVITY]: "hoạt động worker",
};

const formatDateTimeVI = (date: Date): string =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);

const buildRestrictionDescription = (
  feature: RestrictionFeature,
  endsAt: Date | null | undefined
): string => {
  const label = RESTRICTION_FEATURE_LABELS_VI[feature];
  if (!endsAt) return `Bạn đang bị cấm ${label} vĩnh viễn.`;
  return `Bạn đang bị cấm ${label} đến ${formatDateTimeVI(new Date(endsAt))}.`;
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const toId = (value: unknown): string => {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const getBookingDashboardLink = (
  recipientId: string,
  booking: IBookingDocument
): string => {
  const clientId = toId(booking.client_id);
  const workerId = toId(booking.worker_id);

  if (recipientId === workerId) {
    return "/worker/bookings";
  }

  if (recipientId === clientId) {
    return "/client/bookings";
  }

  return "/admin/dashboard";
};

const getBookingStatusNotificationContent = (
  status: BookingStatus
): { title: string; body: string } => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return {
        title: "Booking đã được xác nhận",
        body: "Booking của bạn đã được người thực hiện xác nhận.",
      };
    case BookingStatus.REJECTED:
      return {
        title: "Booking bị từ chối",
        body: "Yêu cầu booking đã bị từ chối.",
      };
    case BookingStatus.IN_PROGRESS:
      return {
        title: "Booking đang thực hiện",
        body: "Booking đã bắt đầu và đang được thực hiện.",
      };
    case BookingStatus.PENDING_CLIENT_ACCEPTANCE:
      return {
        title: "Booking chờ xác nhận hoàn thành",
        body: "Worker đã báo hoàn thành. Vui lòng xác nhận hoặc khiếu nại nếu cần.",
      };
    case BookingStatus.COMPLETED:
      return {
        title: "Booking đã hoàn thành",
        body: "Booking đã hoàn thành thành công.",
      };
    case BookingStatus.CANCELLED:
      return {
        title: "Booking đã bị hủy",
        body: "Booking đã bị hủy.",
      };
    case BookingStatus.DISPUTED:
      return {
        title: "Booking đang tranh chấp",
        body: "Một khiếu nại đã được mở cho booking này.",
      };
    case BookingStatus.EXPIRED:
      return {
        title: "Booking đã hết hạn",
        body: "Booking đã hết hạn.",
      };
    case BookingStatus.PENDING:
    default:
      return {
        title: "Trạng thái booking đã cập nhật",
        body: `Trạng thái booking của bạn hiện là ${status}.`,
      };
  }
};

export class NotificationEventService {
  async bookingCreated(booking: IBookingDocument): Promise<void> {
    const bookingId = toId(booking._id);
    const workerId = toId(booking.worker_id);
    const clientId = toId(booking.client_id);

    await notificationService.notify({
      recipient_ids: [workerId],
      actor_id: clientId,
      type: NotificationType.BOOKING_CREATED,
      category: NotificationCategory.BOOKING,
      title: "Yêu cầu đặt lịch mới",
      body: "Bạn vừa nhận được một yêu cầu đặt lịch mới.",
      data: { booking_id: bookingId },
      link: getBookingDashboardLink(workerId, booking),
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-created:${bookingId}`,
    });
  }

  async bookingStatusUpdated(
    booking: IBookingDocument,
    status: BookingStatus,
    actorId: string
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const clientId = toId(booking.client_id);
    const workerId = toId(booking.worker_id);
    const recipients = [clientId, workerId].filter((id) => id !== actorId);
    const { title, body } = getBookingStatusNotificationContent(status);

    if (recipients.length === 0) {
      return;
    }

    // Gửi per-recipient với link theo role: worker → /worker/bookings, client → /client/bookings
    await Promise.all(
      recipients.map((recipientId) =>
        notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.BOOKING_STATUS_UPDATED,
          category: NotificationCategory.BOOKING,
          title,
          body,
          data: { booking_id: bookingId, status },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.HIGH,
          dedupe_key: `booking-status:${bookingId}:${status}:${recipientId}`,
        })
      )
    );
  }

  async bookingCancelled(
    booking: IBookingDocument,
    actorId: string,
    cancelledBy: CancelledBy
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const clientId = toId(booking.client_id);
    const workerId = toId(booking.worker_id);
    const recipients = [clientId, workerId].filter((id) => id !== actorId);
    const admin = await userRepository.findFirstAdmin();

    if (admin?._id) {
      recipients.push(toId(admin._id));
    }

    await Promise.all(
      recipients.map((recipientId) =>
        notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.BOOKING_CANCELLED,
          category: NotificationCategory.BOOKING,
          title: "Booking đã bị hủy",
          body: `Một booking đã bị hủy bởi ${cancelledBy}.`,
          data: { booking_id: bookingId, cancelled_by: cancelledBy },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.HIGH,
          dedupe_key: `booking-cancelled:${bookingId}:${recipientId}`,
        })
      )
    );
  }

  async bookingAutoExpiredWarning(
    booking: IBookingDocument,
    input: {
      deadline: Date;
      reason:
        | "short_notice_confirmation_timeout"
        | "confirmation_deadline_before_start";
    }
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const workerId = toId(booking.worker_id);
    const body =
      input.reason === "short_notice_confirmation_timeout"
        ? "Booking đã hết hạn vì bạn không xác nhận trong thời gian cho phép."
        : "Booking đã hết hạn vì bạn không xác nhận trước giờ bắt đầu 6 giờ.";

    await notificationService.notify({
      recipient_ids: [workerId],
      type: NotificationType.BOOKING_STATUS_UPDATED,
      category: NotificationCategory.BOOKING,
      title: "Cảnh báo: booking đã hết hạn",
      body: `${body} Vui lòng phản hồi booking đúng hạn để tránh ảnh hưởng uy tín.`,
      data: {
        booking_id: bookingId,
        status: BookingStatus.EXPIRED,
        reason: input.reason,
        confirmation_deadline: input.deadline.toISOString(),
      },
      link: getBookingDashboardLink(workerId, booking),
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-auto-expired-warning:${bookingId}`,
    });
  }

  async bookingUpdated(
    booking: IBookingDocument,
    actorId: string
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const clientId = toId(booking.client_id);
    const workerId = toId(booking.worker_id);
    const recipients = [clientId, workerId].filter((id) => id !== actorId);

    await Promise.all(
      recipients.map((recipientId) =>
        notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.BOOKING_UPDATED,
          category: NotificationCategory.BOOKING,
          title: "Booking đã được cập nhật",
          body: "Thông tin booking đã được cập nhật.",
          data: { booking_id: bookingId },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.NORMAL,
          dedupe_key: `booking-updated:${bookingId}:${recipientId}`,
        })
      )
    );
  }

  async bookingReminder(
    booking: IBookingDocument,
    hoursBeforeStart: 1 | 24
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const clientId = toId(booking.client_id);
    const workerId = toId(booking.worker_id);
    const startTime = booking.schedule.start_time;

    await notificationService.notify({
      recipient_ids: [clientId, workerId],
      type: NotificationType.BOOKING_REMINDER,
      category: NotificationCategory.BOOKING,
      title: `Booking starts in ${hoursBeforeStart}h`,
      body: `Your booking starts at ${startTime.toISOString()}.`,
      data: {
        booking_id: bookingId,
        starts_at: startTime.toISOString(),
        hours_before_start: hoursBeforeStart,
      },
      link: "/notifications",
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
      ],
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-reminder:${bookingId}:${hoursBeforeStart}h`,
    });
  }

  async disputeCreated(
    booking: IBookingDocument,
    actorId: string
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const workerId = toId(booking.worker_id);
    const recipients = [workerId];
    const admin = await userRepository.findFirstAdmin();

    if (admin?._id) {
      recipients.push(toId(admin._id));
    }

    await Promise.all(
      recipients.map((recipientId) =>
        notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.DISPUTE_CREATED,
          category: NotificationCategory.DISPUTE,
          title: "Có khiếu nại booking mới",
          body: "Một khiếu nại mới đã được tạo cho booking.",
          data: { booking_id: bookingId },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.URGENT,
          dedupe_key: `dispute-created:${bookingId}:${recipientId}`,
        })
      )
    );
  }

  async disputeResolved(
    booking: IBookingDocument,
    actorId: string,
    resolution: DisputeResolution
  ): Promise<void> {
    const bookingId = toId(booking._id);
    const recipients = [toId(booking.client_id), toId(booking.worker_id)];

    await Promise.all(
      recipients.map((recipientId) =>
        notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.DISPUTE_RESOLVED,
          category: NotificationCategory.DISPUTE,
          title: "Khiếu nại booking đã được xử lý",
          body: `Khiếu nại booking đã được xử lý với kết quả: ${resolution}.`,
          data: { booking_id: bookingId, resolution },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.HIGH,
          dedupe_key: `dispute-resolved:${bookingId}:${resolution}:${recipientId}`,
        })
      )
    );
  }

  async walletEvent(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    dedupeKey: string;
  }): Promise<void> {
    await notificationService.notify({
      recipient_ids: [input.userId],
      type: input.type,
      category: NotificationCategory.WALLET,
      title: input.title,
      body: input.body,
      data: input.data || {},
      link: "/client/wallet",
      priority: NotificationPriority.HIGH,
      dedupe_key: input.dedupeKey,
    });
  }

  async walletBalanceReconciliationAlert(input: {
    scanned_count: number;
    reconciled_count: number;
    failed_count: number;
    mismatches: Array<{
      user_id: string;
      stored_balance: number | null;
      calculated_balance: number | null;
      error?: string;
    }>;
  }): Promise<void> {
    const admin = await userRepository.findFirstAdmin();
    if (!admin?._id) return;

    const preview = input.mismatches
      .slice(0, 10)
      .map((item) =>
        item.error
          ? `${item.user_id}: ${item.error}`
          : `${item.user_id}: ${item.stored_balance} -> ${item.calculated_balance}`
      )
      .join("\n");

    await notificationService.notify({
      recipient_ids: [toId(admin._id)],
      type: NotificationType.SECURITY_ALERT,
      category: NotificationCategory.SECURITY,
      title: "Wallet balance reconciliation alert",
      body: [
        `Scanned: ${input.scanned_count}`,
        `Reconciled: ${input.reconciled_count}`,
        `Failed: ${input.failed_count}`,
        preview ? `Details:\n${preview}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      data: {
        scanned_count: input.scanned_count,
        reconciled_count: input.reconciled_count,
        failed_count: input.failed_count,
        mismatches: input.mismatches.slice(0, 20),
      },
      link: "/admin/wallet",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.URGENT,
      dedupe_key: `wallet-reconciliation:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  async chatMessage(input: {
    recipientIds: string[];
    actorId: string;
    messageId: string;
    conversationId?: string | null;
    conversationGroupId?: string | null;
    isGroup?: boolean;
  }): Promise<void> {
    await notificationService.notify({
      recipient_ids: input.recipientIds,
      actor_id: input.actorId,
      type: input.isGroup
        ? NotificationType.CHAT_GROUP_MESSAGE
        : NotificationType.CHAT_MESSAGE,
      category: NotificationCategory.CHAT,
      title: input.isGroup ? "Tin nhắn nhóm mới" : "Tin nhắn mới",
      body: input.isGroup
        ? "Bạn có tin nhắn mới trong nhóm."
        : "Bạn có tin nhắn mới.",
      data: {
        message_id: input.messageId,
        conversation_id: input.conversationId,
        conversation_group_id: input.conversationGroupId,
      },
      link: input.isGroup
        ? `/chat?conversation_group_id=${input.conversationGroupId || ""}`
        : input.conversationId
          ? `/chat?conversation_id=${input.conversationId}`
          : "/chat",
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      dedupe_key: `chat-message:${input.messageId}`,
    });
  }

  async reviewCreated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;
    const link =
      recipientId === workerId ? "/worker/bookings" : "/client/bookings";

    await notificationService.notify({
      recipient_ids: [recipientId],
      actor_id: actorId,
      type: NotificationType.REVIEW_CREATED,
      category: NotificationCategory.REVIEW,
      title: "Đánh giá mới",
      body: "Một đánh giá mới đã được gửi cho booking của bạn.",
      data: {
        review_id: toId(review._id),
        booking_id: toId(review.booking_id),
      },
      link,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      dedupe_key: `review-created:${toId(review._id)}`,
    });
  }

  async reputationWarning(userId: string, newScore: number): Promise<void> {
    const body =
      newScore < 30
        ? `Điểm uy tín của bạn hiện là ${newScore}/100. Dưới 30 điểm, bạn bị hạn chế một số tính năng.`
        : `Điểm uy tín của bạn hiện là ${newScore}/100. Hãy hoàn thành booking đúng hạn để duy trì điểm.`;

    await notificationService.notify({
      recipient_ids: [userId],
      type: NotificationType.REPUTATION_WARNING,
      category: NotificationCategory.REPUTATION,
      title: "Cảnh báo điểm uy tín",
      body,
      data: { reputation_score: newScore },
      link: "/worker/bookings",
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      dedupe_key: `reputation-warning:${userId}:${newScore}`,
    });
  }

  async postDeletedByAdmin(input: {
    authorId: string;
    postId: string;
    postBodyPreview: string;
    reportReason?: ReportReason | null;
    reportDescription?: string | null;
    adminNote?: string | null;
    restriction?: {
      feature: RestrictionFeature;
      endsAt: Date | null;
    } | null;
    adminId: string;
  }): Promise<void> {
    const reasonLabel = input.reportReason
      ? REPORT_REASON_LABELS_VI[input.reportReason]
      : null;
    const lines = [
      "Một bài viết của bạn đã bị admin xóa do vi phạm quy định cộng đồng.",
      `Trích đoạn bài viết: "${truncate(input.postBodyPreview || "", 160)}"`,
    ];
    if (reasonLabel) lines.push(`Lý do báo cáo: ${reasonLabel}`);
    if (input.reportDescription) {
      lines.push(`Mô tả báo cáo: ${truncate(input.reportDescription, 280)}`);
    }
    if (input.adminNote) {
      lines.push(`Ghi chú admin: ${truncate(input.adminNote, 280)}`);
    }
    if (input.restriction) {
      lines.push(
        buildRestrictionDescription(
          input.restriction.feature,
          input.restriction.endsAt
        )
      );
    } else {
      lines.push(
        "Hiện chưa áp dụng lệnh cấm đăng bài đối với tài khoản của bạn."
      );
    }

    await notificationService.notify({
      recipient_ids: [input.authorId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_POST_DELETED,
      category: NotificationCategory.ADMIN,
      title: "Bài viết của bạn đã bị admin xóa",
      body: lines.join("\n"),
      data: {
        post_id: input.postId,
        report_reason: input.reportReason ?? null,
        restriction_feature: input.restriction?.feature ?? null,
        restriction_ends_at: input.restriction?.endsAt
          ? input.restriction.endsAt.toISOString()
          : null,
      },
      link: "/posts",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      dedupe_key: `moderation-post-deleted:${input.postId}`,
    });
  }

  async workerReportResolved(input: {
    workerId: string;
    reportId: string;
    reportReason: ReportReason;
    reportDescription: string;
    adminNote?: string | null;
    restriction?: {
      feature: RestrictionFeature;
      endsAt: Date | null;
      reason: string;
    } | null;
    adminId: string;
  }): Promise<void> {
    const reasonLabel = REPORT_REASON_LABELS_VI[input.reportReason];
    const lines = [
      "Báo cáo liên quan đến bạn đã được admin xem xét xong.",
      `Lý do báo cáo: ${reasonLabel}`,
      `Mô tả báo cáo: ${truncate(input.reportDescription, 280)}`,
    ];
    if (input.adminNote) {
      lines.push(`Ghi chú admin: ${truncate(input.adminNote, 280)}`);
    }
    if (input.restriction) {
      lines.push(
        `Kết luận: ${buildRestrictionDescription(input.restriction.feature, input.restriction.endsAt)}`
      );
      if (input.restriction.reason) {
        lines.push(`Lý do cấm: ${truncate(input.restriction.reason, 280)}`);
      }
    } else {
      lines.push(
        "Kết luận: Không có dấu hiệu vi phạm. Tài khoản của bạn không bị áp dụng chế tài."
      );
    }

    await notificationService.notify({
      recipient_ids: [input.workerId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_REPORT_RESOLVED,
      category: NotificationCategory.ADMIN,
      title: input.restriction
        ? "Báo cáo về bạn đã xử lý — áp dụng chế tài"
        : "Báo cáo về bạn đã xử lý — không vi phạm",
      body: lines.join("\n"),
      data: {
        report_id: input.reportId,
        report_reason: input.reportReason,
        restriction_feature: input.restriction?.feature ?? null,
        restriction_ends_at: input.restriction?.endsAt
          ? input.restriction.endsAt.toISOString()
          : null,
      },
      link: "/worker/bookings",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      dedupe_key: `moderation-report-resolved:${input.reportId}`,
    });
  }

  async userRestrictionApplied(input: {
    userId: string;
    feature: RestrictionFeature;
    reason: string;
    endsAt: Date | null;
    reportId?: string | null;
    adminId: string;
    restrictionId: string;
  }): Promise<void> {
    const lines = [
      buildRestrictionDescription(input.feature, input.endsAt),
      `Lý do: ${truncate(input.reason || "Vi phạm chính sách cộng đồng", 280)}`,
    ];
    if (input.reportId) {
      lines.push(
        "Lệnh cấm này được áp dụng sau khi admin xử lý báo cáo liên quan."
      );
    }
    const featureLabel = RESTRICTION_FEATURE_LABELS_VI[input.feature];

    await notificationService.notify({
      recipient_ids: [input.userId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_RESTRICTION_APPLIED,
      category: NotificationCategory.ADMIN,
      title: `Bạn đã bị cấm ${featureLabel}`,
      body: lines.join("\n"),
      data: {
        restriction_id: input.restrictionId,
        feature: input.feature,
        ends_at: input.endsAt ? input.endsAt.toISOString() : null,
        report_id: input.reportId ?? null,
      },
      link:
        input.feature === RestrictionFeature.WORKER_ACTIVITY
          ? "/worker/bookings"
          : "/posts",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      dedupe_key: `moderation-restriction-applied:${input.restrictionId}`,
    });
  }

  async reviewUpdated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;
    const link =
      recipientId === workerId ? "/worker/bookings" : "/client/bookings";

    await notificationService.notify({
      recipient_ids: [recipientId],
      actor_id: actorId,
      type: NotificationType.REVIEW_UPDATED,
      category: NotificationCategory.REVIEW,
      title: "Đánh giá đã được cập nhật",
      body: "Một đánh giá về booking của bạn đã được cập nhật.",
      data: {
        review_id: toId(review._id),
        booking_id: toId(review.booking_id),
      },
      link,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      dedupe_key: `review-updated:${toId(review._id)}:${Date.now()}`,
    });
  }
}

export const notificationEventService = new NotificationEventService();
