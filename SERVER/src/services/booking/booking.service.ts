import mongoose, { Types } from "mongoose";
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
import { PaginatedResponse } from "../../utils/pagination";
import { holdBalanceForBooking } from "../wallet/wallet.service";
import { CreateEscrowInput } from "../../types/escrow/escrow.types";

export interface RoleInfo {
  isWorker: boolean;
  isClient: boolean;
  isAdmin?: boolean;
}

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

  private isBookingOwner(
    booking: IBookingDocument,
    userId: string,
    roleInfo: RoleInfo
  ): boolean {
    const isClient = booking.client_id._id.toString() === userId;
    const isWorker = booking.worker_id._id.toString() === userId;
    const isAdmin = roleInfo.isAdmin === true;
    return isClient || isWorker || isAdmin;
  }

  private isBookingClient(booking: IBookingDocument, userId: string): boolean {
    return booking.client_id._id.toString() === userId;
  }

  private isBookingWorker(booking: IBookingDocument, userId: string): boolean {
    return booking.worker_id._id.toString() === userId;
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

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

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
      const escrow = await escrowRepository.create(escrowData);

      await bookingRepository.update(booking._id.toString(), {
        escrow_id: escrow._id,
        transaction_id: holdTransactionId,
        payment_status: BookingPaymentStatus.PAID,
      });

      await session.commitTransaction();

      return this.getBookingOrThrow(booking._id.toString());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getBookingById(
    bookingId: string,
    userId: string,
    roleInfo: RoleInfo
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);
    this.ensureAuthorized(
      this.isBookingOwner(booking, userId, roleInfo),
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
    );
    return booking;
  }

  async getBookingsByClient(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const result = await bookingRepository.findByClientId(query);
    return result;
  }

  async getBookingsByWorker(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    return bookingRepository.findByWorkerId(query);
  }

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

    this.validateBookingStatus(booking, "update");

    if (
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.REJECTED
    ) {
      this.ensureAuthorized(
        this.isBookingWorker(booking, userId),
        BOOKING_MESSAGES.ONLY_WORKER_CAN_UPDATE_STATUS
      );
    }

    if (
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

    this.validateBookingStatus(booking, "cancel");

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
    userId: string,
    updateData: Partial<IBookingDocument>,
    roleInfo: RoleInfo
  ): Promise<IBookingDocument> {
    const booking = await this.getBookingOrThrow(bookingId);

    this.ensureAuthorized(
      this.isBookingOwner(booking, userId, roleInfo),
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS
    );

    this.validateBookingStatus(booking, "update");

    const isClient = this.isBookingClient(booking, userId);
    const isWorker = this.isBookingWorker(booking, userId);

    if (updateData.schedule || updateData.pricing || updateData.client_notes) {
      this.ensureAuthorized(
        isClient,
        BOOKING_MESSAGES.ONLY_CLIENT_CAN_UPDATE_BOOKING
      );

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
      this.ensureAuthorized(
        isWorker,
        BOOKING_MESSAGES.ONLY_WORKER_CAN_UPDATE_RESPONSE
      );
    }

    const filteredUpdateData: Partial<IBookingDocument> = {};

    if (isClient) {
      if (updateData.schedule) {
        filteredUpdateData.schedule = updateData.schedule;
      }
      if (updateData.pricing) {
        filteredUpdateData.pricing = updateData.pricing;
      }
      if (updateData.client_notes !== undefined) {
        filteredUpdateData.client_notes = updateData.client_notes;
      }
    }

    if (isWorker) {
      if (updateData.worker_response !== undefined) {
        filteredUpdateData.worker_response = updateData.worker_response;
      }
    }

    if (roleInfo.isAdmin) {
      Object.assign(filteredUpdateData, updateData);
    }

    const updatedBooking = await bookingRepository.update(
      bookingId,
      filteredUpdateData
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
