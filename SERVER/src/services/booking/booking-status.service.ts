import { bookingRepository } from "../../repositories/booking/booking.repository";
import { IBookingDocument } from "../../types/booking/booking.types";
import {
  BookingStatus,
  CancellationReason,
  CancelledBy,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { logger } from "../../utils/logger";
import { BookingBaseService, RoleInfo } from "./booking-helpers";

export class BookingStatusService extends BookingBaseService {
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

    if (status === BookingStatus.CONFIRMED) {
      const workerIdRaw = booking.worker_id as unknown as { _id?: unknown }
      const workerId = String(workerIdRaw?._id ?? booking.worker_id)
      await this.validateScheduleConflict(
        workerId,
        booking.schedule.start_time,
        booking.schedule.end_time,
        bookingId
      );
    }

    if (
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.REJECTED ||
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.PENDING_CLIENT_ACCEPTANCE
    ) {
      this.ensureAuthorized(
        this.isBookingWorker(booking, userId),
        BOOKING_MESSAGES.ONLY_WORKER_CAN_UPDATE_STATUS
      );
    }

    if (status === BookingStatus.COMPLETED) {
      this.ensureAuthorized(
        this.isBookingClient(booking, userId),
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
      );
    }

    const updateData: Partial<IBookingDocument> = {
      ...this.getTimestampUpdateData(status, booking),
    };

    if (workerResponse !== undefined) {
      updateData.worker_response = workerResponse;
    }

    const updatedBooking = await bookingRepository.updateStatus(bookingId, status, updateData);

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    void notificationEventService
      .bookingStatusUpdated(updatedBooking, status, userId)
      .catch((error) => logger.error("Booking status notification failed:", error));

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

    this.validateStatusTransition(booking.status as BookingStatus, BookingStatus.CANCELLED);

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

    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancellation: {
          cancelled_at: new Date(),
          cancelled_by: cancelledBy,
          reason,
          notes,
        },
      }
    );

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    void notificationEventService
      .bookingCancelled(updatedBooking, userId, cancelledBy)
      .catch((error) => logger.error("Booking cancellation notification failed:", error));

    if (cancelledBy === CancelledBy.WORKER) {
      const workerId = updatedBooking.worker_id.toString();
      void reputationConfigService
        .getValue(ReputationConfigKey.WORKER_CANCEL_DEDUCTION)
        .then((points) => reputationService.deductPoints(workerId, points))
        .catch((err) => logger.error("Reputation deduction after worker cancel failed:", err));
    }

    return updatedBooking;
  }
}
