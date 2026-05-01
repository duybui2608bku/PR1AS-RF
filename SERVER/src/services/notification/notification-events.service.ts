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
        title: "Booking confirmed",
        body: "The booking has been confirmed by the worker.",
      };
    case BookingStatus.REJECTED:
      return {
        title: "Booking rejected",
        body: "The booking request was rejected.",
      };
    case BookingStatus.IN_PROGRESS:
      return {
        title: "Booking in progress",
        body: "The booking has started and is now in progress.",
      };
    case BookingStatus.COMPLETED:
      return {
        title: "Booking completed",
        body: "The booking has been completed successfully.",
      };
    case BookingStatus.CANCELLED:
      return {
        title: "Booking cancelled",
        body: "The booking has been cancelled.",
      };
    case BookingStatus.DISPUTED:
      return {
        title: "Booking disputed",
        body: "A dispute has been opened for this booking.",
      };
    case BookingStatus.EXPIRED:
      return {
        title: "Booking expired",
        body: "The booking has expired.",
      };
    case BookingStatus.PENDING:
    default:
      return {
        title: "Booking status updated",
        body: `Your booking status is now ${status}.`,
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
      title: "New booking request",
      body: "You have received a new booking request.",
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
      title: "Booking cancelled",
      body: `A booking was cancelled by ${cancelledBy}.`,
      data: { booking_id: bookingId, cancelled_by: cancelledBy },
      link: "/notifications",
      priority: NotificationPriority.HIGH,
      dedupe_key: `booking-cancelled:${bookingId}`,
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
      title: "Booking updated",
      body: "A booking has been updated.",
      data: { booking_id: bookingId },
      link: "/notifications",
      priority: NotificationPriority.NORMAL,
      dedupe_key: `booking-updated:${bookingId}:${Date.now()}`,
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
      title: "Booking dispute opened",
      body: "A dispute has been opened for a booking.",
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
      title: "Booking dispute resolved",
      body: `A booking dispute was resolved with result: ${resolution}.`,
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
      title: input.isGroup ? "New group message" : "New message",
      body: "You have a new message.",
      data: {
        message_id: input.messageId,
        conversation_id: input.conversationId,
        conversation_group_id: input.conversationGroupId,
      },
      link: input.isGroup
        ? `/chat/group?group=${input.conversationGroupId || ""}`
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
      title: "New review received",
      body: "A new review has been submitted for a completed booking.",
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

  async reviewUpdated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;

    await notificationService.notify({
      recipient_ids: [recipientId],
      actor_id: actorId,
      type: NotificationType.REVIEW_UPDATED,
      category: NotificationCategory.REVIEW,
      title: "Review updated",
      body: "A review on one of your bookings was updated.",
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
