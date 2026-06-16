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
import type { IWorkerQuestionDocument } from "../../types/worker-question";
import { notificationService } from "./notification.service";
import { t, Locale } from "../../utils/i18n";
import nodemailerUtils from "../../utils/nodemailer";

const INTL_LOCALE_MAP: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  ko: "ko-KR",
  zh: "zh-CN",
};

const REPORT_REASON_KEYS: Record<ReportReason, string> = {
  [ReportReason.SCAM]: "notif.reportReason.scam",
  [ReportReason.LOW_QUALITY]: "notif.reportReason.lowQuality",
  [ReportReason.HARASSMENT]: "notif.reportReason.harassment",
  [ReportReason.FAKE_PROFILE]: "notif.reportReason.fakeProfile",
  [ReportReason.OTHER]: "notif.reportReason.other",
};

const RESTRICTION_FEATURE_KEYS: Record<RestrictionFeature, string> = {
  [RestrictionFeature.POST_CREATE]: "notif.restrictionFeature.postCreate",
  [RestrictionFeature.WORKER_ACTIVITY]:
    "notif.restrictionFeature.workerActivity",
};

async function getRecipientLocale(userId: string): Promise<Locale> {
  try {
    const user = await userRepository.findById(userId);
    return (user?.meta_data?.locale as Locale) ?? "en";
  } catch {
    return "en";
  }
}

const formatDateTime = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(INTL_LOCALE_MAP[locale], {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);

const buildRestrictionDescription = (
  feature: RestrictionFeature,
  endsAt: Date | null | undefined,
  locale: Locale
): string => {
  const featureLabel = t(RESTRICTION_FEATURE_KEYS[feature], locale);
  if (!endsAt) {
    return t("notif.restriction.permanent", locale, { feature: featureLabel });
  }
  return t("notif.restriction.until", locale, {
    feature: featureLabel,
    endsAt: formatDateTime(new Date(endsAt), locale),
  });
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

const getBookingStatusContent = (
  status: BookingStatus,
  locale: Locale
): { title: string; body: string } => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return {
        title: t("notif.booking.status.confirmed.title", locale),
        body: t("notif.booking.status.confirmed.body", locale),
      };
    case BookingStatus.REJECTED:
      return {
        title: t("notif.booking.status.rejected.title", locale),
        body: t("notif.booking.status.rejected.body", locale),
      };
    case BookingStatus.IN_PROGRESS:
      return {
        title: t("notif.booking.status.inProgress.title", locale),
        body: t("notif.booking.status.inProgress.body", locale),
      };
    case BookingStatus.PENDING_CLIENT_ACCEPTANCE:
      return {
        title: t("notif.booking.status.pendingAcceptance.title", locale),
        body: t("notif.booking.status.pendingAcceptance.body", locale),
      };
    case BookingStatus.COMPLETED:
      return {
        title: t("notif.booking.status.completed.title", locale),
        body: t("notif.booking.status.completed.body", locale),
      };
    case BookingStatus.CANCELLED:
      return {
        title: t("notif.booking.status.cancelled.title", locale),
        body: t("notif.booking.status.cancelled.body", locale),
      };
    case BookingStatus.DISPUTED:
      return {
        title: t("notif.booking.status.disputed.title", locale),
        body: t("notif.booking.status.disputed.body", locale),
      };
    case BookingStatus.EXPIRED:
      return {
        title: t("notif.booking.status.expired.title", locale),
        body: t("notif.booking.status.expired.body", locale),
      };
    case BookingStatus.PENDING:
    default:
      return {
        title: t("notif.booking.status.default.title", locale),
        body: t("notif.booking.status.default.body", locale, { status }),
      };
  }
};

export class NotificationEventService {
  async bookingCreated(booking: IBookingDocument): Promise<void> {
    const bookingId = toId(booking._id);
    const workerId = toId(booking.worker_id);
    const clientId = toId(booking.client_id);
    const locale = await getRecipientLocale(workerId);

    await notificationService.notify({
      recipient_ids: [workerId],
      actor_id: clientId,
      type: NotificationType.BOOKING_CREATED,
      category: NotificationCategory.BOOKING,
      title: t("notif.booking.created.title", locale),
      body: t("notif.booking.created.body", locale),
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

    if (recipients.length === 0) {
      return;
    }

    await Promise.all(
      recipients.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        const { title, body } = getBookingStatusContent(status, locale);
        return notificationService.notify({
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
        });
      })
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
      recipients.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.BOOKING_CANCELLED,
          category: NotificationCategory.BOOKING,
          title: t("notif.booking.cancelled.title", locale),
          body: t("notif.booking.cancelled.body", locale, { cancelledBy }),
          data: { booking_id: bookingId, cancelled_by: cancelledBy },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.HIGH,
          dedupe_key: `booking-cancelled:${bookingId}:${recipientId}`,
        });
      })
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
    const locale = await getRecipientLocale(workerId);

    const bodyMain = t(
      input.reason === "short_notice_confirmation_timeout"
        ? "notif.booking.autoExpired.body.shortNotice"
        : "notif.booking.autoExpired.body.confirmationDeadline",
      locale
    );
    const bodySuffix = t("notif.booking.autoExpired.suffix", locale);

    await notificationService.notify({
      recipient_ids: [workerId],
      type: NotificationType.BOOKING_STATUS_UPDATED,
      category: NotificationCategory.BOOKING,
      title: t("notif.booking.autoExpired.title", locale),
      body: `${bodyMain} ${bodySuffix}`,
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
      recipients.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.BOOKING_UPDATED,
          category: NotificationCategory.BOOKING,
          title: t("notif.booking.updated.title", locale),
          body: t("notif.booking.updated.body", locale),
          data: { booking_id: bookingId },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.NORMAL,
          dedupe_key: `booking-updated:${bookingId}:${recipientId}`,
        });
      })
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

    await Promise.all(
      [clientId, workerId].map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          type: NotificationType.BOOKING_REMINDER,
          category: NotificationCategory.BOOKING,
          title: t("notif.booking.reminder.title", locale, {
            hours: hoursBeforeStart,
          }),
          body: t("notif.booking.reminder.body", locale, {
            startsAt: formatDateTime(startTime, locale),
          }),
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
          dedupe_key: `booking-reminder:${bookingId}:${hoursBeforeStart}h:${recipientId}`,
        });
      })
    );
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
      recipients.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.DISPUTE_CREATED,
          category: NotificationCategory.DISPUTE,
          title: t("notif.dispute.created.title", locale),
          body: t("notif.dispute.created.body", locale),
          data: { booking_id: bookingId },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.URGENT,
          dedupe_key: `dispute-created:${bookingId}:${recipientId}`,
        });
      })
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
      recipients.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: actorId,
          type: NotificationType.DISPUTE_RESOLVED,
          category: NotificationCategory.DISPUTE,
          title: t("notif.dispute.resolved.title", locale),
          body: t("notif.dispute.resolved.body", locale, { resolution }),
          data: { booking_id: bookingId, resolution },
          link: getBookingDashboardLink(recipientId, booking),
          priority: NotificationPriority.HIGH,
          dedupe_key: `dispute-resolved:${bookingId}:${resolution}:${recipientId}`,
        });
      })
    );
  }

  async walletEvent(input: {
    userId: string;
    type: NotificationType;
    titleKey: string;
    bodyKey: string;
    vars?: Record<string, string | number>;
    data?: Record<string, unknown>;
    dedupeKey: string;
  }): Promise<void> {
    const locale = await getRecipientLocale(input.userId);
    await notificationService.notify({
      recipient_ids: [input.userId],
      type: input.type,
      category: NotificationCategory.WALLET,
      title: t(input.titleKey, locale, input.vars),
      body: t(input.bodyKey, locale, input.vars),
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
    await Promise.all(
      input.recipientIds.map(async (recipientId) => {
        const locale = await getRecipientLocale(recipientId);
        return notificationService.notify({
          recipient_ids: [recipientId],
          actor_id: input.actorId,
          type: input.isGroup
            ? NotificationType.CHAT_GROUP_MESSAGE
            : NotificationType.CHAT_MESSAGE,
          category: NotificationCategory.CHAT,
          title: t(
            input.isGroup
              ? "notif.chat.groupMessage.title"
              : "notif.chat.message.title",
            locale
          ),
          body: t(
            input.isGroup
              ? "notif.chat.groupMessage.body"
              : "notif.chat.message.body",
            locale
          ),
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
          dedupe_key: `chat-message:${input.messageId}:${recipientId}`,
        });
      })
    );
  }

  async reviewCreated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;
    const link =
      recipientId === workerId ? "/worker/bookings" : "/client/bookings";
    const locale = await getRecipientLocale(recipientId);

    await notificationService.notify({
      recipient_ids: [recipientId],
      actor_id: actorId,
      type: NotificationType.REVIEW_CREATED,
      category: NotificationCategory.REVIEW,
      title: t("notif.review.created.title", locale),
      body: t("notif.review.created.body", locale),
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

  async workerQuestionCreated(
    question: IWorkerQuestionDocument
  ): Promise<void> {
    const workerId = toId(question.worker_id);
    const askerId = question.asker_id ? toId(question.asker_id) : null;
    const locale = await getRecipientLocale(workerId);

    await notificationService.notify({
      recipient_ids: [workerId],
      actor_id: askerId,
      type: NotificationType.WORKER_QUESTION_CREATED,
      category: NotificationCategory.QUESTION,
      title: t("notif.workerQuestion.created.title", locale),
      body: t("notif.workerQuestion.created.body", locale, {
        excerpt: truncate(question.question, 160),
      }),
      data: { question_id: toId(question._id) },
      link: `/worker/${workerId}`,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
      ],
      priority: NotificationPriority.HIGH,
      dedupe_key: `worker-question-created:${toId(question._id)}`,
    });
  }

  async workerQuestionAnswered(
    question: IWorkerQuestionDocument
  ): Promise<void> {
    const workerId = toId(question.worker_id);
    const answer = question.answer ?? "";

    // Registered asker → standard notification (in-app + email). Guest asker has
    // no account, so notify() would filter them out; email them directly instead.
    if (question.asker_id) {
      const askerId = toId(question.asker_id);
      const locale = await getRecipientLocale(askerId);
      await notificationService.notify({
        recipient_ids: [askerId],
        actor_id: workerId,
        type: NotificationType.WORKER_QUESTION_ANSWERED,
        category: NotificationCategory.QUESTION,
        title: t("notif.workerQuestion.answered.title", locale),
        body: t("notif.workerQuestion.answered.body", locale, {
          answer: truncate(answer, 160),
        }),
        data: { question_id: toId(question._id) },
        link: `/worker/${workerId}`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        priority: NotificationPriority.NORMAL,
        dedupe_key: `worker-question-answered:${toId(question._id)}`,
      });
      return;
    }

    if (!question.asker_email) {
      return;
    }

    const locale: Locale = "en";
    const html = `
      <p>${t("notif.workerQuestion.answered.emailIntro", locale)}</p>
      <p><strong>${t("notif.workerQuestion.answered.emailQuestionLabel", locale)}:</strong><br/>${truncate(question.question, 500)}</p>
      <p><strong>${t("notif.workerQuestion.answered.emailAnswerLabel", locale)}:</strong><br/>${truncate(answer, 1000)}</p>
    `;
    await nodemailerUtils({
      email: question.asker_email,
      subject: t("notif.workerQuestion.answered.title", locale),
      html,
    });
  }

  async reputationWarning(userId: string, newScore: number): Promise<void> {
    const locale = await getRecipientLocale(userId);
    const bodyKey =
      newScore < 30
        ? "notif.reputation.warning.body.critical"
        : "notif.reputation.warning.body.normal";

    await notificationService.notify({
      recipient_ids: [userId],
      type: NotificationType.REPUTATION_WARNING,
      category: NotificationCategory.REPUTATION,
      title: t("notif.reputation.warning.title", locale),
      body: t(bodyKey, locale, { score: newScore }),
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
    const locale = await getRecipientLocale(input.authorId);
    const reasonKey = input.reportReason
      ? REPORT_REASON_KEYS[input.reportReason]
      : null;
    const lines = [
      t("notif.moderation.postDeleted.intro", locale),
      t("notif.moderation.postDeleted.preview", locale, {
        excerpt: truncate(input.postBodyPreview || "", 160),
      }),
    ];
    if (reasonKey) {
      lines.push(
        t("notif.moderation.postDeleted.reason", locale, {
          reason: t(reasonKey, locale),
        })
      );
    }
    if (input.reportDescription) {
      lines.push(
        t("notif.moderation.postDeleted.description", locale, {
          description: truncate(input.reportDescription, 280),
        })
      );
    }
    if (input.adminNote) {
      lines.push(
        t("notif.moderation.postDeleted.adminNote", locale, {
          note: truncate(input.adminNote, 280),
        })
      );
    }
    if (input.restriction) {
      lines.push(
        buildRestrictionDescription(
          input.restriction.feature,
          input.restriction.endsAt,
          locale
        )
      );
    } else {
      lines.push(t("notif.moderation.postDeleted.noRestriction", locale));
    }

    await notificationService.notify({
      recipient_ids: [input.authorId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_POST_DELETED,
      category: NotificationCategory.ADMIN,
      title: t("notif.moderation.postDeleted.title", locale),
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
    const locale = await getRecipientLocale(input.workerId);
    const reasonKey = REPORT_REASON_KEYS[input.reportReason];
    const lines = [
      t("notif.moderation.reportResolved.intro", locale),
      t("notif.moderation.reportResolved.reason", locale, {
        reason: t(reasonKey, locale),
      }),
      t("notif.moderation.reportResolved.description", locale, {
        description: truncate(input.reportDescription, 280),
      }),
    ];
    if (input.adminNote) {
      lines.push(
        t("notif.moderation.reportResolved.adminNote", locale, {
          note: truncate(input.adminNote, 280),
        })
      );
    }
    if (input.restriction) {
      lines.push(
        t("notif.moderation.reportResolved.conclusion.sanctioned", locale, {
          description: buildRestrictionDescription(
            input.restriction.feature,
            input.restriction.endsAt,
            locale
          ),
        })
      );
      if (input.restriction.reason) {
        lines.push(
          t("notif.moderation.reportResolved.restrictionReason", locale, {
            reason: truncate(input.restriction.reason, 280),
          })
        );
      }
    } else {
      lines.push(t("notif.moderation.reportResolved.conclusion.clean", locale));
    }

    await notificationService.notify({
      recipient_ids: [input.workerId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_REPORT_RESOLVED,
      category: NotificationCategory.ADMIN,
      title: input.restriction
        ? t("notif.moderation.reportResolved.title.sanctioned", locale)
        : t("notif.moderation.reportResolved.title.clean", locale),
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
    const locale = await getRecipientLocale(input.userId);
    const featureLabel = t(RESTRICTION_FEATURE_KEYS[input.feature], locale);
    const lines = [
      buildRestrictionDescription(input.feature, input.endsAt, locale),
      t("notif.moderation.restriction.reason", locale, {
        reason: truncate(
          input.reason ||
            t("notif.moderation.restriction.defaultReason", locale),
          280
        ),
      }),
    ];
    if (input.reportId) {
      lines.push(t("notif.moderation.restriction.fromReport", locale));
    }

    await notificationService.notify({
      recipient_ids: [input.userId],
      actor_id: input.adminId,
      type: NotificationType.MODERATION_RESTRICTION_APPLIED,
      category: NotificationCategory.ADMIN,
      title: t("notif.moderation.restriction.title", locale, {
        feature: featureLabel,
      }),
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

  async accountBanned(input: {
    userId: string;
    adminId: string;
    reason?: string;
  }): Promise<void> {
    const locale = await getRecipientLocale(input.userId);
    const reasonLine = input.reason
      ? t("notif.account.banned.body.reason", locale, {
          reason: truncate(input.reason, 280),
        })
      : t("notif.account.banned.body.defaultReason", locale);

    await notificationService.notify({
      recipient_ids: [input.userId],
      actor_id: input.adminId,
      type: NotificationType.ACCOUNT_BANNED,
      category: NotificationCategory.SECURITY,
      title: t("notif.account.banned.title", locale),
      body: [
        t("notif.account.banned.body.intro", locale),
        reasonLine,
        t("notif.account.banned.body.contact", locale),
      ].join("\n"),
      data: { reason: input.reason ?? null },
      link: "/",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.URGENT,
      dedupe_key: `account-banned:${input.userId}:${Date.now()}`,
    });
  }

  async accountUnbanned(input: {
    userId: string;
    adminId: string;
  }): Promise<void> {
    const locale = await getRecipientLocale(input.userId);
    await notificationService.notify({
      recipient_ids: [input.userId],
      actor_id: input.adminId,
      type: NotificationType.ACCOUNT_UNBANNED,
      category: NotificationCategory.SECURITY,
      title: t("notif.account.unbanned.title", locale),
      body: t("notif.account.unbanned.body", locale),
      data: {},
      link: "/",
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      priority: NotificationPriority.HIGH,
      dedupe_key: `account-unbanned:${input.userId}:${Date.now()}`,
    });
  }

  async reviewUpdated(review: IReviewDocument, actorId: string): Promise<void> {
    const clientId = toId(review.client_id);
    const workerId = toId(review.worker_id);
    const recipientId = actorId === clientId ? workerId : clientId;
    const link =
      recipientId === workerId ? "/worker/bookings" : "/client/bookings";
    const locale = await getRecipientLocale(recipientId);

    await notificationService.notify({
      recipient_ids: [recipientId],
      actor_id: actorId,
      type: NotificationType.REVIEW_UPDATED,
      category: NotificationCategory.REVIEW,
      title: t("notif.review.updated.title", locale),
      body: t("notif.review.updated.body", locale),
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
