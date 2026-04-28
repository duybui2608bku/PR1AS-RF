import { bookingRepository } from "../../repositories/booking/booking.repository";
import { escrowService } from "../escrow/escrow.service";
import { IBookingDocument } from "../../types/booking/booking.types";
import {
  BookingStatus,
  BookingPaymentStatus,
  DisputeReason,
  DisputeResolution,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingStatusService } from "./booking-status.service";
import { RoleInfo } from "./booking-helpers";

export class BookingDisputeService extends BookingStatusService {
  async createDispute(
    bookingId: string,
    userId: string,
    reason: DisputeReason,
    description: string,
    evidenceUrls: string[]
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);

    this.ensureAuthorized(
      this.isBookingClient(booking, userId),
      BOOKING_MESSAGES.ONLY_CLIENT_CAN_DISPUTE
    );

    const canCreateDispute =
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.COMPLETED;

    if (!canCreateDispute) {
      throw new AppError(
        BOOKING_MESSAGES.INVALID_STATUS_TRANSITION,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_INVALID_STATUS_TRANSITION
      );
    }

    if (booking.dispute) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_ALREADY_DISPUTED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_ALREADY_DISPUTED
      );
    }

    const dispute = {
      reason,
      description,
      evidence_urls: evidenceUrls,
      disputed_by: userId,
      disputed_at: new Date(),
      resolution: null,
      resolution_notes: "",
      resolved_by: null,
      resolved_at: null,
      refund_amount: 0,
      penalty_amount: 0,
    };

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      BookingStatus.DISPUTED,
      {
        dispute,
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
    refundAmount?: number,
    roleInfo?: RoleInfo
  ): Promise<IBookingDocument> {
    if (!roleInfo?.isAdmin) {
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

    const clientId = this.resolveClientId(booking);

    let finalStatus: BookingStatus;
    let paymentStatus: BookingPaymentStatus =
      booking.payment_status as BookingPaymentStatus;
    let disputeRefundAmount = 0;
    let disputePenaltyAmount = 0;

    if (resolution === DisputeResolution.FAVOR_CLIENT) {
      const result = await escrowService.refundEscrowForCancelledBooking(
        bookingId,
        clientId,
        booking.schedule.start_time
      );
      if (result) {
        disputeRefundAmount = result.refundAmount;
        disputePenaltyAmount = result.penaltyAmount;
      }
      finalStatus = BookingStatus.CANCELLED;
      paymentStatus = BookingPaymentStatus.REFUNDED;
    } else if (resolution === DisputeResolution.FAVOR_WORKER) {
      await escrowService.releaseEscrowForCompletedBooking(bookingId);
      finalStatus = BookingStatus.COMPLETED;
    } else if (resolution === DisputeResolution.PARTIAL_REFUND) {
      if (refundAmount === undefined || refundAmount <= 0) {
        throw new AppError(
          BOOKING_MESSAGES.DISPUTE_INVALID_REFUND_AMOUNT,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.DISPUTE_CANNOT_RESOLVE
        );
      }
      const result = await escrowService.refundEscrowForCancelledBooking(
        bookingId,
        clientId,
        booking.schedule.start_time
      );
      if (result) {
        disputeRefundAmount = result.refundAmount;
        disputePenaltyAmount = result.penaltyAmount;
      }
      finalStatus = BookingStatus.COMPLETED;
      paymentStatus = BookingPaymentStatus.PARTIALLY_REFUNDED;
    } else {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_DISPUTED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.DISPUTE_CANNOT_RESOLVE
      );
    }

    const disputeUpdate = {
      ...booking.dispute,
      resolution,
      resolution_notes: resolutionNotes,
      resolved_by: adminUserId,
      resolved_at: new Date(),
      refund_amount: disputeRefundAmount,
      penalty_amount: disputePenaltyAmount,
    };

    const updateData: Partial<IBookingDocument> = {
      dispute: disputeUpdate as IBookingDocument["dispute"],
      payment_status: paymentStatus,
    };

    if (finalStatus === BookingStatus.COMPLETED) {
      updateData.completed_at = new Date();
    }

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      finalStatus!,
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
      .catch((error) =>
        logger.error("Dispute resolution notification failed:", error)
      );

    return updatedBooking;
  }
}
