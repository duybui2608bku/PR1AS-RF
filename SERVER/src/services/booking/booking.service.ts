import { Types } from "mongoose";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
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

export class BookingService {
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

    const workerService = await workerServiceRepository.findById(
      input.worker_service_id.toString()
    );
    if (!workerService) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (workerService.worker_id.toString() !== input.worker_id.toString()) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (!workerService.is_active) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

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

    const hasConflict = await bookingRepository.checkScheduleConflict(
      input.worker_id.toString(),
      input.schedule.start_time,
      input.schedule.end_time
    );

    if (hasConflict) {
      throw new AppError(
        BOOKING_MESSAGES.INVALID_SCHEDULE,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_INVALID_SCHEDULE
      );
    }

    const bookingData: CreateBookingInput = {
      ...input,
      client_id: new Types.ObjectId(clientId),
    };

    const booking = await bookingRepository.create(bookingData);
    return booking;
  }

  async getBookingById(
    bookingId: string,
    userId: string,
    userRoles: string[]
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    const isAdmin = userRoles.includes("admin");
    const isOwner =
      booking.client_id.toString() === userId ||
      booking.worker_id.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    return booking;
  }

  async getBookingsByClient(
    clientId: string,
    query: BookingQuery
  ): Promise<{
    data: IBookingDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findByClientId(
      clientId,
      { ...query, page, limit }
    );

    return PaginationHelper.format(bookings, { page, limit, skip: (page - 1) * limit }, total);
  }

  async getBookingsByWorker(
    workerId: string,
    query: BookingQuery
  ): Promise<{
    data: IBookingDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findByWorkerId(
      workerId,
      { ...query, page, limit }
    );

    return PaginationHelper.format(bookings, { page, limit, skip: (page - 1) * limit }, total);
  }

  async getAllBookings(query: BookingQuery): Promise<{
    data: IBookingDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { bookings, total } = await bookingRepository.findAll({
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(bookings, { page, limit, skip: (page - 1) * limit }, total);
  }

  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    userId: string,
    userRoles: string[],
    workerResponse?: string
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    const isAdmin = userRoles.includes("admin");
    const isWorker = booking.worker_id.toString() === userId;
    const isClient = booking.client_id.toString() === userId;

    if (status === BookingStatus.CONFIRMED || status === BookingStatus.REJECTED) {
      if (!isAdmin && !isWorker) {
        throw new AppError(
          BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
          HTTP_STATUS.FORBIDDEN,
          ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
        );
      }
    }

    if (
      status === BookingStatus.CANCELLED &&
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_CANCEL_COMPLETED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_CANCEL
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_CANCEL_CANCELLED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_CANCEL
      );
    }

    const updateData: Partial<IBookingDocument> = {};
    if (workerResponse !== undefined) {
      updateData.worker_response = workerResponse;
    }

    if (status === BookingStatus.CONFIRMED && !booking.confirmed_at) {
      updateData.confirmed_at = new Date();
    }

    if (status === BookingStatus.IN_PROGRESS && !booking.started_at) {
      updateData.started_at = new Date();
    }

    if (status === BookingStatus.COMPLETED && !booking.completed_at) {
      updateData.completed_at = new Date();
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
    userId: string,
    userRoles: string[]
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_CANCEL_COMPLETED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_CANCEL
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_CANCEL_CANCELLED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_CANCEL
      );
    }

    const isAdmin = userRoles.includes("admin");
    const isWorker = booking.worker_id.toString() === userId;
    const isClient = booking.client_id.toString() === userId;

    if (
      cancelledBy === CancelledBy.CLIENT &&
      !isAdmin &&
      !isClient
    ) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    if (
      cancelledBy === CancelledBy.WORKER &&
      !isAdmin &&
      !isWorker
    ) {
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

    const updatedBooking = await bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancellation,
    });

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    return updatedBooking;
  }

  async updateBooking(
    bookingId: string,
    updateData: Partial<IBookingDocument>,
    userId: string,
    userRoles: string[]
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_UPDATE_COMPLETED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_UPDATE
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(
        BOOKING_MESSAGES.CANNOT_UPDATE_CANCELLED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_CANNOT_UPDATE
      );
    }

    const isAdmin = userRoles.includes("admin");
    const isClient = booking.client_id.toString() === userId;
    const isWorker = booking.worker_id.toString() === userId;

    if (updateData.schedule || updateData.pricing) {
      if (!isAdmin && !isClient) {
        throw new AppError(
          BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
          HTTP_STATUS.FORBIDDEN,
          ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
        );
      }

      if (updateData.schedule) {
        const hasConflict = await bookingRepository.checkScheduleConflict(
          booking.worker_id.toString(),
          updateData.schedule.start_time,
          updateData.schedule.end_time,
          bookingId
        );

        if (hasConflict) {
          throw new AppError(
            BOOKING_MESSAGES.INVALID_SCHEDULE,
            HTTP_STATUS.BAD_REQUEST,
            ErrorCode.BOOKING_INVALID_SCHEDULE
          );
        }
      }
    }

    if (updateData.worker_response && !isAdmin && !isWorker) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
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
