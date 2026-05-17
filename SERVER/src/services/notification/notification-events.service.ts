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
import type { IBookingDocument } from "../../types/booking";
import type { IReviewDocument } from "../../types/review";
import { notificationService } from "./notification.service";

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

    await notificationService.notify({
      recipient_ids: recipients,
      actor_id: actorId,
      type: NotificationType.BOOKING_STATUS_UPDATED,
      category: NotificationCategory.BOOKING,
      title,
      body,
      data: { booking_id: bookingId, status },
      link: "/notifications",
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-status:${bookingId}:${status}`,
    });
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

    await notificationService.notify({
      recipient_ids: recipients,
      actor_id: actorId,
      type: NotificationType.BOOKING_CANCELLED,
      category: NotificationCategory.BOOKING,
      title: "Booking đã bị hủy",
      body: `Một booking đã bị hủy bởi ${cancelledBy}.`,
      data: { booking_id: bookingId, cancelled_by: cancelledBy },
      link: "/notifications",
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-cancelled:${bookingId}`,
    });
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

    await notificationService.notify({
      recipient_ids: recipients,
      actor_id: actorId,
      type: NotificationType.BOOKING_UPDATED,
      category: NotificationCategory.BOOKING,
      title: "Booking đã được cập nhật",
      body: "Thông tin booking đã được cập nhật.",
      data: { booking_id: bookingId },
      link: "/notifications",
      priority: NotificationPriority.NORMAL,
      dedupe_key: `booking-updated:${bookingId}:${Date.now()}`,
    });
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
    const recipients = [toId(booking.worker_id)];
    const admin = await userRepository.findFirstAdmin();

    if (admin?._id) {
      recipients.push(toId(admin._id));
    }

    await notificationService.notify({
      recipient_ids: recipients,
      actor_id: actorId,
      type: NotificationType.DISPUTE_CREATED,
      category: NotificationCategory.DISPUTE,
      title: "Có khiếu nại booking mới",
      body: "Một khiếu nại mới đã được tạo cho booking.",
      data: { booking_id: bookingId },
      link: "/notifications",
      priority: NotificationPriority.URGENT,
      dedupe_key: `dispute-created:${bookingId}`,
    });
  }

  async disputeResolved(
    booking: IBookingDocument,
    actorId: string,
    resolution: DisputeResolution
  ): Promise<void> {
    const bookingId = toId(booking._id);
    await notificationService.notify({
      recipient_ids: [toId(booking.client_id), toId(booking.worker_id)],
      actor_id: actorId,
      type: NotificationType.DISPUTE_RESOLVED,
      category: NotificationCategory.DISPUTE,
      title: "Khiếu nại booking đã được xử lý",
      body: `Khiếu nại booking đã được xử lý với kết quả: ${resolution}.`,
      data: { booking_id: bookingId, resolution },
      link: "/notifications",
      priority: NotificationPriority.HIGH,
      dedupe_key: `dispute-resolved:${bookingId}:${resolution}`,
    });
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
      link: "/client/bookings",
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
      link: "/notifications",
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH,
      dedupe_key: `reputation-warning:${userId}:${newScore}`,
    });
  }

  async reviewUpdated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;

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
      link: "/client/bookings",
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
      dedupe_key: `review-updated:${toId(review._id)}:${Date.now()}`,
    });
  }
}

export const notificationEventService = new NotificationEventService();
