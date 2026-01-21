import { Types } from "mongoose";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { escrowRepository } from "../../repositories/escrow/escrow.repository";
import {
  CreateBookingInput,
  BookingQuery,
  IBookingDocument,
} from "../../types/booking/booking.types";
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
import { PaginationHelper } from "../../utils/pagination";
import { holdBalanceForBooking } from "../wallet/wallet.service";
import { CreateEscrowInput } from "../../types/escrow/escrow.types";

export class BookingService {
  private async getBookingOrThrow(
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

  private validateBookingStatus(
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

  private ensureAuthorized(
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

  private async validateWorkerService(
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

  private async validateScheduleConflict(
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

  private getTimestampUpdateData(
    status: BookingStatus,
    booking: IBookingDocument
  ) {
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

  async createBooking(
    clientId: string,
    input: CreateBookingInput
  ): Promise<IBookingDocument> {
    const worker = await userRepository.findById(input.worker_id.toString());
    if (!worker) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    await this.validateWorkerService(
      input.worker_service_id.toString(),
      input.worker_id.toString()
    );

    const service = await serviceRepository.findById(
      input.service_id.toString()
    );
    if (!service) {
      throw new AppError(
        BOOKING_MESSAGES.SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    await this.validateScheduleConflict(
      input.worker_id.toString(),
      input.schedule.start_time,
      input.schedule.end_time
    );

    const bookingData: CreateBookingInput = {
      ...input,
      client_id: new Types.ObjectId(clientId),
    };
    const booking = await bookingRepository.create(bookingData);

    const holdTransactionId = await holdBalanceForBooking(
      clientId,
      input.pricing.total_amount,
      booking._id.toString(),
      `Hold balance for booking ${booking._id.toString()}`
    );

    const escrowData: CreateEscrowInput = {
      booking_id: booking._id,
      client_id: new Types.ObjectId(clientId),
      worker_id: input.worker_id,
      amount: input.pricing.total_amount,
      platform_fee: input.pricing.platform_fee,
      worker_payout: input.pricing.worker_payout,
      currency: input.pricing.currency,
      hold_transaction_id: new Types.ObjectId(holdTransactionId),
    };
    await escrowRepository.create(escrowData);

    await bookingRepository.update(booking._id.toString(), {
      escrow_id: escrowData.booking_id,
      transaction_id: holdTransactionId,
      payment_status: BookingPaymentStatus.PAID,
    });

    return this.getBookingOrThrow(booking._id.toString());
  }

  async getBookingById(
    bookingId: string,
    roleInfo: { isWorker: boolean; isClient: boolean }
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.ensureAuthorized(roleInfo.isWorker || roleInfo.isClient);
    return booking;
  }

  async getBookingsByClient(
    clientId: string,
    query: BookingQuery
  ): Promise<{
    data: IBookingDocument[];
    pagination: ReturnType<typeof PaginationHelper.format>["pagination"];
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findByClientId(
      clientId,
      { ...query, page, limit }
    );

    return PaginationHelper.format(
      bookings,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async getBookingsByWorker(
    workerId: string,
    query: BookingQuery
  ): Promise<{
    data: IBookingDocument[];
    pagination: ReturnType<typeof PaginationHelper.format>["pagination"];
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findByWorkerId(
      workerId,
      { ...query, page, limit }
    );

    return PaginationHelper.format(
      bookings,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async getAllBookings(query: BookingQuery): Promise<{
    data: IBookingDocument[];
    pagination: ReturnType<typeof PaginationHelper.format>["pagination"];
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findAll({
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(
      bookings,
      { page, limit, skip: (page - 1) * limit },
      total
    );
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    roleInfo: { isWorker: boolean; isClient: boolean },
    workerResponse?: string
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.validateBookingStatus(booking, "update");

    if (
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.REJECTED
    ) {
      this.ensureAuthorized(roleInfo.isWorker);
    }

    const updateData: Partial<IBookingDocument> = {
      ...this.getTimestampUpdateData(status, booking),
    };

    if (workerResponse !== undefined) {
      updateData.worker_response = workerResponse;
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

    return updatedBooking;
  }

  async cancelBooking(
    bookingId: string,
    cancelledBy: CancelledBy,
    reason: CancellationReason,
    notes: string,
    roleInfo: { isWorker: boolean; isClient: boolean }
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.validateBookingStatus(booking, "cancel");

    if (cancelledBy === CancelledBy.CLIENT) {
      this.ensureAuthorized(roleInfo.isClient);
    } else if (cancelledBy === CancelledBy.WORKER) {
      this.ensureAuthorized(roleInfo.isWorker);
    }

    const cancellation = {
      cancelled_at: new Date(),
      cancelled_by: cancelledBy,
      reason,
      notes,
      refund_amount: 0,
      penalty_amount: 0,
    };

    return this.getBookingOrThrow(
      (
        await bookingRepository.update(bookingId, {
          status: BookingStatus.CANCELLED,
          cancellation,
        })
      )?._id.toString() || bookingId
    );
  }

  async updateBooking(
    bookingId: string,
    updateData: Partial<IBookingDocument>,
    roleInfo: { isWorker: boolean; isClient: boolean }
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.validateBookingStatus(booking, "update");

    if (updateData.schedule || updateData.pricing) {
      this.ensureAuthorized(roleInfo.isClient);

      if (updateData.schedule) {
        await this.validateScheduleConflict(
          booking.worker_id.toString(),
          updateData.schedule.start_time,
          updateData.schedule.end_time,
          bookingId
        );
      }
    }
    if (updateData.worker_response) {
      this.ensureAuthorized(roleInfo.isWorker);
    }

    const updatedBooking = await bookingRepository.update(
      bookingId,
      updateData
    );

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    return updatedBooking;
  }
}

export const bookingService = new BookingService();
