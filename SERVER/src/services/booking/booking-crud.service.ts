import { Types } from "mongoose";
import crypto from "crypto";
import {
  bookingRepository,
  CreateBookingFailureReason,
} from "../../repositories/booking/booking.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import {
  AdminBookingAnalytics,
  AdminBookingAnalyticsQuery,
  CreateBookingInput,
  BookingQuery,
  IBookingDocument,
  BookingClientProfile,
} from "../../types/booking/booking.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import {
  BOOKING_MESSAGES,
  REPUTATION_MESSAGES,
} from "../../constants/messages";
import { accountStatusError } from "../../utils/user-status";
import { PaginatedResponse } from "../../utils/pagination";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { BookingBaseService, RoleInfo } from "./booking-helpers";
import { UserRole, UserStatus } from "../../types/auth/user.types";
import { BookingStatus } from "../../constants/booking";
import { moderationService } from "../moderation";
import { RestrictionFeature } from "../../constants/moderation";
import { sendQuickBookingCreatedEmails } from "./booking-email";

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

    // Load independent dependencies concurrently. The final worker eligibility
    // and schedule conflict checks happen again inside the atomic create path.
    const [worker, service] = await Promise.all([
      userRepository.findById(workerId),
      serviceRepository.findById(input.service_id.toString()),
      this.validateWorkerService(input.worker_service_id.toString(), workerId),
    ]);

    if (!worker) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    const workerIneligible =
      worker.status !== UserStatus.ACTIVE ||
      !worker.verify_email ||
      !worker.roles.includes(UserRole.WORKER);

    if (workerIneligible) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_INELIGIBLE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    if (!service) {
      throw new AppError(
        BOOKING_MESSAGES.SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    const createResult = await bookingRepository.createIfNoConflict({
      ...input,
      client_id: new Types.ObjectId(clientId),
    });

    if (!createResult.booking) {
      if (
        createResult.failureReason ===
        CreateBookingFailureReason.WORKER_INELIGIBLE
      ) {
        throw new AppError(
          BOOKING_MESSAGES.WORKER_INELIGIBLE,
          HTTP_STATUS.FORBIDDEN,
          ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
        );
      }

      throw new AppError(
        BOOKING_MESSAGES.SCHEDULE_CONFLICT,
        HTTP_STATUS.CONFLICT,
        ErrorCode.BOOKING_INVALID_SCHEDULE
      );
    }

    const createdBooking = createResult.booking;

    void notificationEventService
      .bookingCreated(createdBooking)
      .catch((error) => logger.error("Booking notification failed:", error));

    return createdBooking;
  }

  async createGuestBooking(
    input: CreateBookingInput & {
      guest_contact: { name: string; email: string; phone?: string | null };
      guest_locale?: string | null;
    }
  ): Promise<IBookingDocument> {
    const workerId = input.worker_id.toString();

    await moderationService.assertNoActiveRestriction(
      workerId,
      RestrictionFeature.WORKER_ACTIVITY
    );

    const [worker, service] = await Promise.all([
      userRepository.findById(workerId),
      serviceRepository.findById(input.service_id.toString()),
      this.validateWorkerService(input.worker_service_id.toString(), workerId),
    ]);

    if (!worker) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    const workerIneligible =
      worker.status !== UserStatus.ACTIVE ||
      !worker.verify_email ||
      !worker.roles.includes(UserRole.WORKER);

    if (workerIneligible) {
      throw new AppError(
        BOOKING_MESSAGES.WORKER_INELIGIBLE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    if (!service) {
      throw new AppError(
        BOOKING_MESSAGES.SERVICE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    const createResult = await bookingRepository.createIfNoConflict({
      ...input,
      client_id: null,
      is_guest: true,
      public_ref: this.generatePublicRef(),
      guest_locale: input.guest_locale?.trim() || "en",
      guest_contact: {
        name: input.guest_contact.name.trim(),
        email: input.guest_contact.email.trim().toLowerCase(),
        phone: input.guest_contact.phone?.trim() || null,
      },
    });

    if (!createResult.booking) {
      if (
        createResult.failureReason ===
        CreateBookingFailureReason.WORKER_INELIGIBLE
      ) {
        throw new AppError(
          BOOKING_MESSAGES.WORKER_INELIGIBLE,
          HTTP_STATUS.FORBIDDEN,
          ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
        );
      }

      throw new AppError(
        BOOKING_MESSAGES.SCHEDULE_CONFLICT,
        HTTP_STATUS.CONFLICT,
        ErrorCode.BOOKING_INVALID_SCHEDULE
      );
    }

    const createdBooking = createResult.booking;

    void notificationEventService
      .bookingCreated(createdBooking)
      .catch((error) => logger.error("Booking notification failed:", error));

    void sendQuickBookingCreatedEmails(createdBooking).catch((error) =>
      logger.error("Quick booking email failed:", error)
    );

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

  async getClientProfileForBooking(
    bookingId: string,
    workerId: string
  ): Promise<BookingClientProfile> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    const bookingWorkerId =
      booking.worker_id && typeof booking.worker_id === "object"
        ? (booking.worker_id as { toString(): string }).toString()
        : String(booking.worker_id);
    if (bookingWorkerId !== workerId) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
      );
    }

    const clientRef = booking.client_id as
      | { _id?: { toString(): string }; toString(): string }
      | null;
    if (!clientRef) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }
    const clientId = clientRef._id
      ? clientRef._id.toString()
      : clientRef.toString();

    const [client, stats] = await Promise.all([
      userRepository.findById(clientId),
      bookingRepository.countClientBookingStats(clientId),
    ]);
    if (!client) {
      throw new AppError(
        BOOKING_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    return {
      full_name: client.full_name ?? null,
      avatar: client.avatar ?? null,
      member_since: new Date(client.created_at).toISOString(),
      is_verified: Boolean(client.verify_email),
      reputation_score: client.meta_data?.reputation_score ?? 100,
      total_count: stats.total,
      completed_count: stats.completed,
      client_cancelled_count: stats.clientCancelled,
    };
  }

  async lookupGuestBooking(
    publicRef: string,
    email: string
  ): Promise<IBookingDocument> {
    const booking = await bookingRepository.findGuestBookingByPublicRef(
      publicRef,
      email
    );
    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }
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

    const wantsClientEditableFields =
      updateData.schedule !== undefined ||
      updateData.pricing !== undefined ||
      updateData.client_notes !== undefined;

    if (wantsClientEditableFields) {
      this.ensureAuthorized(
        isClient,
        BOOKING_MESSAGES.ONLY_CLIENT_CAN_UPDATE_BOOKING
      );

      // Client may only edit schedule/pricing/notes while booking is still
      // PENDING (worker has not yet confirmed). After confirmation the
      // agreed-upon terms are locked to prevent bait-and-switch on price
      // or surprise reschedules.
      if (booking.status !== BookingStatus.PENDING) {
        throw new AppError(
          BOOKING_MESSAGES.CLIENT_CANNOT_UPDATE_CONFIRMED,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.BOOKING_CANNOT_UPDATE
        );
      }

      if (updateData.schedule) {
        await this.validateScheduleConflict(
          booking.worker_id._id.toString(),
          updateData.schedule.start_time,
          updateData.schedule.end_time,
          bookingId
        );
      }
    }

    if (updateData.worker_response !== undefined) {
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
      // Whitelist admin-editable fields. Admin must NEVER be able to mutate
      // identity (_id, client_id, worker_id), bypass validateStatusTransition
      // by setting status directly, or rewrite immutable timestamps.
      if (updateData.schedule !== undefined) {
        filteredUpdateData.schedule = updateData.schedule;
      }
      if (updateData.pricing !== undefined) {
        filteredUpdateData.pricing = updateData.pricing;
      }
      if (updateData.client_notes !== undefined) {
        filteredUpdateData.client_notes = updateData.client_notes;
      }
      if (updateData.worker_response !== undefined) {
        filteredUpdateData.worker_response = updateData.worker_response;
      }
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
    const statusError = accountStatusError(roleInfo.status);
    if (statusError) {
      throw statusError;
    }

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

  private generatePublicRef(): string {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `QB-${suffix}`;
  }
}
