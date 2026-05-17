import { Types } from "mongoose";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import {
  AdminBookingAnalytics,
  AdminBookingAnalyticsQuery,
  CreateBookingInput,
  BookingQuery,
  IBookingDocument,
} from "../../types/booking/booking.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { BOOKING_MESSAGES } from "../../constants/messages";
import { PaginatedResponse } from "../../utils/pagination";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingBaseService, RoleInfo } from "./booking-helpers";
import { UserRole } from "../../types/auth/user.types";
import { BookingStatus } from "../../constants/booking";
import { REPUTATION_MESSAGES } from "../../constants/messages";
import { moderationService } from "../moderation";
import { RestrictionFeature } from "../../constants/moderation";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function endOfUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

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

    const clientDoc = await userRepository.findById(clientId);
    const clientReputation = clientDoc?.meta_data?.reputation_score ?? 100;
    if (clientReputation < 30) {
      throw new AppError(
        REPUTATION_MESSAGES.TOO_LOW_FOR_BOOKING,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REPUTATION_SCORE_TOO_LOW
      );
    }

    await moderationService.assertNoActiveRestriction(
      workerId,
      RestrictionFeature.WORKER_ACTIVITY
    );

    // All 4 run concurrently — validations throw on failure, first two capture data
    const [worker, service] = await Promise.all([
      userRepository.findById(workerId),
      serviceRepository.findById(input.service_id.toString()),
      this.validateWorkerService(input.worker_service_id.toString(), workerId),
      this.validateScheduleConflict(
        workerId,
        input.schedule.start_time,
        input.schedule.end_time
      ),
    ]);

    if (!worker) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (!service) {
      throw new AppError(
        BOOKING_MESSAGES.SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    // create() now returns a populated document — no second fetch needed
    const createdBooking = await bookingRepository.create({
      ...input,
      client_id: new Types.ObjectId(clientId),
    });

    void notificationEventService
      .bookingCreated(createdBooking)
      .catch((error) => logger.error("Booking notification failed:", error));

    return createdBooking;
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
      if (updateData.schedule)
        filteredUpdateData.schedule = updateData.schedule;
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

  async getMyBookings(
    userId: string,
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const requestedRole = query.role || roleInfo.lastActiveRole;

    if (
      requestedRole === UserRole.WORKER &&
      roleInfo.roles.includes(UserRole.WORKER)
    ) {
      return bookingRepository.findByWorkerId({
        ...query,
        worker_id: new Types.ObjectId(userId),
      });
    }

    if (
      requestedRole === UserRole.CLIENT &&
      roleInfo.roles.includes(UserRole.CLIENT)
    ) {
      return bookingRepository.findByClientId({
        ...query,
        client_id: new Types.ObjectId(userId),
      });
    }

    throw AppError.forbidden();
  }

  async getAdminBookingAnalytics(
    query: AdminBookingAnalyticsQuery
  ): Promise<AdminBookingAnalytics> {
    const endDate = endOfUtcDay(query.end_date ?? new Date());
    const startDate = startOfUtcDay(
      query.start_date ?? new Date(endDate.getTime() - 29 * DAY_MS)
    );
    const raw = await bookingRepository.getAdminAnalytics({
      start_date: startDate,
      end_date: endDate,
      recent_limit: query.recent_limit,
    });

    const statusCountMap = new Map(
      raw.status_counts.map((item) => [item.status, item.count])
    );
    const completedBookings = statusCountMap.get(BookingStatus.COMPLETED) ?? 0;
    const cancelledBookings = statusCountMap.get(BookingStatus.CANCELLED) ?? 0;
    const disputedBookings = statusCountMap.get(BookingStatus.DISPUTED) ?? 0;

    const dateCountMap = new Map(
      raw.created_by_date.map((item) => [item.date, item.count])
    );
    const completionDateMap = new Map(
      raw.completion_by_date.map((item) => [item.date, item])
    );

    const createdByDate = [];
    const completionByDate = [];

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      const date = formatDateKey(cursor);
      const completion = completionDateMap.get(date);
      const total = completion?.total ?? 0;
      const completed = completion?.completed ?? 0;

      createdByDate.push({
        date,
        count: dateCountMap.get(date) ?? 0,
      });
      completionByDate.push({
        date,
        total,
        completed,
        completion_rate: total > 0 ? roundRate((completed / total) * 100) : 0,
      });
    }

    return {
      total_bookings: raw.total,
      completed_bookings: completedBookings,
      completion_rate:
        raw.total > 0 ? roundRate((completedBookings / raw.total) * 100) : 0,
      cancelled_bookings: cancelledBookings,
      cancellation_rate:
        raw.total > 0 ? roundRate((cancelledBookings / raw.total) * 100) : 0,
      disputed_bookings: disputedBookings,
      dispute_rate:
        raw.total > 0 ? roundRate((disputedBookings / raw.total) * 100) : 0,
      status_counts: Object.values(BookingStatus).map((status) => {
        const count = statusCountMap.get(status) ?? 0;
        return {
          status,
          count,
          percentage: raw.total > 0 ? roundRate((count / raw.total) * 100) : 0,
        };
      }),
      created_by_date: createdByDate,
      completion_by_date: completionByDate,
      recent_bookings: raw.recent_bookings,
    };
  }
}
