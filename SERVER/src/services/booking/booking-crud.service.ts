import mongoose, { Types } from "mongoose";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { escrowRepository } from "../../repositories/escrow/escrow.repository";
import {
  CreateBookingInput,
  BookingQuery,
  IBookingDocument,
} from "../../types/booking/booking.types";
import {
  BookingPaymentStatus,
} from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { PaginatedResponse } from "../../utils/pagination";
import { walletService } from "../wallet/wallet.service";
import { CreateEscrowInput } from "../../types/escrow/escrow.types";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingBaseService, RoleInfo } from "./booking-helpers";

export class BookingCrudService extends BookingBaseService {
  async createBooking(
    clientId: string,
    input: CreateBookingInput
  ): Promise<IBookingDocument> {
    const workerId = input.worker_id.toString();

    if (clientId === workerId) {
      throw new AppError(
        BOOKING_MESSAGES.SELF_BOOKING_NOT_ALLOWED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_SELF_BOOKING_NOT_ALLOWED
      );
    }

    const worker = await userRepository.findById(workerId);
    if (!worker) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    await this.validateWorkerService(
      input.worker_service_id.toString(),
      workerId
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
      workerId,
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
      const booking = await bookingRepository.create(bookingData, session);

      let holdTransactionId: string | null = null;
      if (input.pricing.total_amount > 0) {
        holdTransactionId = await walletService.holdBalanceForBooking(
          clientId,
          input.pricing.total_amount,
          booking._id.toString(),
          `Hold balance for booking ${booking._id.toString()}`
        );
      }

      const escrowData: CreateEscrowInput = {
        booking_id: booking._id,
        client_id: new Types.ObjectId(clientId),
        worker_id: input.worker_id,
        amount: input.pricing.total_amount,
        platform_fee: input.pricing.platform_fee,
        worker_payout: input.pricing.worker_payout,
        currency: input.pricing.currency,
        hold_transaction_id: holdTransactionId
          ? new Types.ObjectId(holdTransactionId)
          : null,
      };
      const escrow = await escrowRepository.create(escrowData, session);

      await bookingRepository.update(
        booking._id.toString(),
        {
          escrow_id: escrow._id,
          transaction_id: holdTransactionId ?? undefined,
          payment_status: BookingPaymentStatus.PAID,
        },
        session
      );

      await session.commitTransaction();

      const createdBooking = await this.getBookingOrThrow(
        booking._id.toString()
      );
      void notificationEventService
        .bookingCreated(createdBooking)
        .catch((error) => logger.error("Booking notification failed:", error));
      return createdBooking;
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
    return bookingRepository.findByClientId(query);
  }

  async getBookingsByWorker(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    return bookingRepository.findByWorkerId(query);
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
      if (updateData.schedule) filteredUpdateData.schedule = updateData.schedule;
      if (updateData.pricing) filteredUpdateData.pricing = updateData.pricing;
      if (updateData.client_notes !== undefined) {
        filteredUpdateData.client_notes = updateData.client_notes;
      }
    }

    if (isWorker && updateData.worker_response !== undefined) {
      filteredUpdateData.worker_response = updateData.worker_response;
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

    void notificationEventService
      .bookingUpdated(updatedBooking, userId)
      .catch((error) =>
        logger.error("Booking updated notification failed:", error)
      );

    return updatedBooking;
  }

}
