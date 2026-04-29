import mongoose, { Types } from "mongoose";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { escrowService } from "../escrow/escrow.service";
import { IBookingDocument } from "../../types/booking/booking.types";
import {
  BookingStatus,
  BookingPaymentStatus,
  CancellationReason,
  CancelledBy,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingCrudService } from "./booking-crud.service";
import { RoleInfo } from "./booking-helpers";

export class BookingStatusService extends BookingCrudService {
  async updateBookingStatus(
    bookingId: string,
    userId: string,
    status: BookingStatus,
    roleInfo: RoleInfo,
    workerResponse?: string
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);

    this.ensureAuthorized(
      this.isBookingOwner(booking, userId, roleInfo),
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
    );

    this.validateStatusTransition(booking.status as BookingStatus, status);

    if (
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.REJECTED ||
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.COMPLETED
    ) {
      this.ensureAuthorized(
        this.isBookingWorker(booking, userId),
        BOOKING_MESSAGES.ONLY_WORKER_CAN_UPDATE_STATUS
      );
    }

    const updateData: Partial<IBookingDocument> = {
      ...this.getTimestampUpdateData(status, booking),
    };

    if (workerResponse !== undefined) {
      updateData.worker_response = workerResponse;
    }

    if (status === BookingStatus.COMPLETED) {
      const escrowResult =
        await escrowService.releaseEscrowForCompletedBooking(bookingId);
      if (escrowResult) {
        updateData.payout_transaction_id =
          escrowResult.releaseTransactionId as unknown as Types.ObjectId;
      }
    }

    if (
      status === BookingStatus.REJECTED &&
      booking.payment_status === BookingPaymentStatus.PAID
    ) {
      const clientId = this.resolveClientId(booking);
      await escrowService.refundEscrowForCancelledBooking(
        bookingId,
        clientId,
        booking.schedule.start_time
      );
      updateData.payment_status = BookingPaymentStatus.REFUNDED;
    }

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      status,
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
      .bookingStatusUpdated(updatedBooking, status, userId)
      .catch((error) =>
        logger.error("Booking status notification failed:", error)
      );

    return updatedBooking;
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    reason: CancellationReason,
    notes: string,
    roleInfo: RoleInfo
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.ensureAuthorized(
      this.isBookingOwner(booking, userId, roleInfo),
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
    );
    this.validateStatusTransition(
      booking.status as BookingStatus,
      BookingStatus.CANCELLED
    );

    let cancelledBy: CancelledBy;
    if (this.isBookingClient(booking, userId)) {
      cancelledBy = CancelledBy.CLIENT;
    } else if (this.isBookingWorker(booking, userId)) {
      cancelledBy = CancelledBy.WORKER;
    } else if (roleInfo.isAdmin) {
      cancelledBy = CancelledBy.ADMIN;
    } else {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    const session = await mongoose.startSession();
    let refundAmount = 0;
    let penaltyAmount = 0;

    try {
      session.startTransaction();

      if (booking.payment_status === BookingPaymentStatus.PAID) {
        const clientId = this.resolveClientId(booking);
        const scheduleStartTime =
          typeof booking.schedule.start_time === "string"
            ? new Date(booking.schedule.start_time)
            : booking.schedule.start_time;

        const result = await escrowService.refundEscrowForCancelledBooking(
          bookingId,
          clientId,
          scheduleStartTime
        );
        if (result) {
          refundAmount = result.refundAmount;
          penaltyAmount = result.penaltyAmount;
        }
      }

      const cancellation = {
        cancelled_at: new Date(),
        cancelled_by: cancelledBy,
        reason,
        notes,
        refund_amount: refundAmount,
        penalty_amount: penaltyAmount,
      };

      const paymentStatus =
        refundAmount > 0
          ? BookingPaymentStatus.REFUNDED
          : booking.payment_status;

      const updatedBooking = await bookingRepository.update(
        bookingId,
        {
          status: BookingStatus.CANCELLED,
          cancellation,
          payment_status: paymentStatus,
        },
        session
      );

      await session.commitTransaction();

      const cancelledBooking = await this.getBookingOrThrow(
        updatedBooking?._id.toString() || bookingId
      );
      void notificationEventService
        .bookingCancelled(cancelledBooking, userId, cancelledBy)
        .catch((error) =>
          logger.error("Booking cancellation notification failed:", error)
        );

      return cancelledBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
