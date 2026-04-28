import { bookingRepository } from "../../repositories/booking/booking.repository";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import {
  IBookingDocument,
} from "../../types/booking/booking.types";
import {
  BookingStatus,
  BOOKING_STATUS_TRANSITIONS,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";

export interface RoleInfo {
  isWorker: boolean;
  isClient: boolean;
  isAdmin?: boolean;
}

export class BookingBaseService {
  protected async getBookingOrThrow(
    bookingId: string
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }
    return booking;
  }

  protected validateStatusTransition(
    currentStatus: BookingStatus,
    targetStatus: BookingStatus
  ): void {
    const allowedTargets = BOOKING_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
      throw new AppError(
        BOOKING_MESSAGES.INVALID_STATUS_TRANSITION,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_INVALID_STATUS_TRANSITION
      );
    }
  }

  protected validateBookingStatus(
    booking: IBookingDocument,
    operation: "cancel" | "update"
  ): void {
    const messages = {
      cancel: {
        completed: BOOKING_MESSAGES.CANNOT_CANCEL_COMPLETED,
        cancelled: BOOKING_MESSAGES.CANNOT_CANCEL_CANCELLED,
      },
      update: {
        completed: BOOKING_MESSAGES.CANNOT_UPDATE_COMPLETED,
        cancelled: BOOKING_MESSAGES.CANNOT_UPDATE_CANCELLED,
      },
    };

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError(
        messages[operation].completed,
        HTTP_STATUS.BAD_REQUEST,
        operation === "cancel"
          ? ErrorCode.BOOKING_CANNOT_CANCEL
          : ErrorCode.BOOKING_CANNOT_UPDATE
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(
        messages[operation].cancelled,
        HTTP_STATUS.BAD_REQUEST,
        operation === "cancel"
          ? ErrorCode.BOOKING_CANNOT_CANCEL
          : ErrorCode.BOOKING_CANNOT_UPDATE
      );
    }
  }

  protected ensureAuthorized(
    hasPermission: boolean,
    message: string = BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
  ): void {
    if (!hasPermission) {
      throw new AppError(
        message,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }
  }

  protected isBookingOwner(
    booking: IBookingDocument,
    userId: string,
    roleInfo: RoleInfo
  ): boolean {
    const isClient = booking.client_id._id.toString() === userId;
    const isWorker = booking.worker_id._id.toString() === userId;
    const isAdmin = roleInfo.isAdmin === true;
    return isClient || isWorker || isAdmin;
  }

  protected isBookingClient(
    booking: IBookingDocument,
    userId: string
  ): boolean {
    return booking.client_id._id.toString() === userId;
  }

  protected isBookingWorker(
    booking: IBookingDocument,
    userId: string
  ): boolean {
    return booking.worker_id._id.toString() === userId;
  }

  protected async validateWorkerService(
    workerServiceId: string,
    workerId: string
  ): Promise<void> {
    const workerService =
      await workerServiceRepository.findById(workerServiceId);

    if (
      !workerService ||
      workerService.worker_id.toString() !== workerId ||
      !workerService.is_active
    ) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }
  }

  protected async validateScheduleConflict(
    workerId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<void> {
    const hasConflict = await bookingRepository.checkScheduleConflict(
      workerId,
      startTime,
      endTime,
      excludeBookingId
    );

    if (hasConflict) {
      throw new AppError(
        BOOKING_MESSAGES.INVALID_SCHEDULE,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_INVALID_SCHEDULE
      );
    }
  }

  protected getTimestampUpdateData(
    status: BookingStatus,
    booking: IBookingDocument
  ): Partial<IBookingDocument> {
    const updates: Partial<IBookingDocument> = {};

    if (status === BookingStatus.CONFIRMED && !booking.confirmed_at) {
      updates.confirmed_at = new Date();
    }
    if (status === BookingStatus.IN_PROGRESS && !booking.started_at) {
      updates.started_at = new Date();
    }
    if (status === BookingStatus.COMPLETED && !booking.completed_at) {
      updates.completed_at = new Date();
    }

    return updates;
  }

  protected resolveClientId(booking: IBookingDocument): string {
    return typeof booking.client_id === "object" && booking.client_id?._id
      ? booking.client_id._id.toString()
      : String(booking.client_id);
  }
}
