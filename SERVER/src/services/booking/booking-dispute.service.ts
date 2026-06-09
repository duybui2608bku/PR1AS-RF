import { bookingRepository } from "../../repositories/booking/booking.repository";
import { IBookingDocument } from "../../types/booking/booking.types";
import {
  BookingStatus,
  BOOKING_LIMITS,
  CancellationReason,
  CancelledBy,
  DisputeReason,
  DisputeResolution,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingBaseService, RoleInfo } from "./booking-helpers";

export class BookingDisputeService extends BookingBaseService {
  async createDispute(
    bookingId: string,
    userId: string,
    reason: DisputeReason,
    description: string,
    evidenceUrls: string[]
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);

    // Either party on the booking may open a dispute. Previously only the
    // client could, which left workers with no recourse if a client refused
    // to mark the work COMPLETED.
    const isParticipant =
      this.isBookingClient(booking, userId) ||
      this.isBookingWorker(booking, userId);
    this.ensureAuthorized(
      isParticipant,
      BOOKING_MESSAGES.ONLY_CLIENT_OR_WORKER_CAN_DISPUTE
    );

    const canCreateDispute =
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.PENDING_CLIENT_ACCEPTANCE ||
      booking.status === BookingStatus.COMPLETED;

    if (!canCreateDispute) {
      throw new AppError(
        BOOKING_MESSAGES.INVALID_STATUS_TRANSITION,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_INVALID_STATUS_TRANSITION
      );
    }

    // Với booking đã COMPLETED, chỉ cho mở khiếu nại trong vòng
    // DISPUTE_WINDOW_DAYS kể từ khi lịch hẹn kết thúc (schedule.end_time).
    // Quá hạn coi như client chấp nhận kết quả. Các trạng thái còn đang diễn ra
    // (IN_PROGRESS, PENDING_CLIENT_ACCEPTANCE) không bị giới hạn thời gian này.
    if (booking.status === BookingStatus.COMPLETED) {
      const deadline =
        booking.schedule.end_time.getTime() +
        BOOKING_LIMITS.DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() > deadline) {
        throw new AppError(
          BOOKING_MESSAGES.DISPUTE_WINDOW_EXPIRED,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.BOOKING_DISPUTE_WINDOW_EXPIRED
        );
      }
    }

    if (booking.dispute) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_ALREADY_DISPUTED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_ALREADY_DISPUTED
      );
    }

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      BookingStatus.DISPUTED,
      {
        dispute: {
          reason,
          description,
          evidence_urls: evidenceUrls,
          disputed_by: userId,
          disputed_at: new Date(),
          resolution: null,
          resolution_notes: "",
          resolved_by: null,
          resolved_at: null,
        },
        disputed_at: new Date(),
      } as Partial<IBookingDocument>
    );

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    void notificationEventService
      .disputeCreated(updatedBooking, userId)
      .catch((error) => logger.error("Dispute notification failed:", error));

    return updatedBooking;
  }

  async resolveDispute(
    bookingId: string,
    adminUserId: string,
    resolution: DisputeResolution,
    resolutionNotes: string,
    roleInfo: RoleInfo
  ): Promise<IBookingDocument> {
    if (!roleInfo.isAdmin) {
      throw new AppError(
        BOOKING_MESSAGES.ONLY_ADMIN_CAN_RESOLVE_DISPUTE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.DISPUTE_CANNOT_RESOLVE
      );
    }

    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status !== BookingStatus.DISPUTED) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_DISPUTED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_NOT_DISPUTED
      );
    }

    const finalStatus =
      resolution === DisputeResolution.FAVOR_CLIENT
        ? BookingStatus.CANCELLED
        : BookingStatus.COMPLETED;

    const now = new Date();
    const updateData: Partial<IBookingDocument> = {
      dispute: {
        ...booking.dispute,
        resolution,
        resolution_notes: resolutionNotes,
        resolved_by: adminUserId,
        resolved_at: now,
      } as IBookingDocument["dispute"],
    };

    if (finalStatus === BookingStatus.COMPLETED) {
      updateData.completed_at = now;
    } else {
      // Resolving in favor of the client cancels the booking. Populate the
      // cancellation block so reports/analytics see who cancelled and why,
      // mirroring the shape produced by the normal cancel flow.
      updateData.cancellation = {
        cancelled_at: now,
        cancelled_by: CancelledBy.ADMIN,
        reason: CancellationReason.POLICY_VIOLATION,
        notes: resolutionNotes,
      };
    }

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      finalStatus,
      updateData
    );

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    void notificationEventService
      .disputeResolved(updatedBooking, adminUserId, resolution)
      .catch((error) => logger.error("Dispute resolution notification failed:", error));

    return updatedBooking;
  }
}
