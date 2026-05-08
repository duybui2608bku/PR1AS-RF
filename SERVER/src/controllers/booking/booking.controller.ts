import { Response } from "express";
import { bookingService } from "../../services/booking/booking.service";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingReasonSchema,
  updateBookingSchema,
  getBookingsQuerySchema,
  adminBookingAnalyticsQuerySchema,
  createDisputeSchema,
  resolveDisputeSchema,
} from "../../validations/booking/booking.validation";
import { BOOKING_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import {
  R,
  validateWithSchema,
  extractUserIdFromRequest,
} from "../../utils";
import { PaginationRequest } from "../../middleware";
import { RoleInfo } from "../../services/booking/booking-helpers";
import { JWTPayload } from "../../utils/jwt";
import { UserRole } from "../../types/auth/user.types";

function roleInfoFromJwt(user: JWTPayload): RoleInfo {
  return {
    isWorker: user.roles.includes(UserRole.WORKER),
    isClient: user.roles.includes(UserRole.CLIENT),
    isAdmin: user.roles.includes(UserRole.ADMIN),
  };
}

export class BookingController {
  async createBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      createBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await bookingService.createBooking(userId, data);
    R.created(res, result, BOOKING_MESSAGES.BOOKING_CREATED, req);
  }

  async getBookingById(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const roleInfo = roleInfoFromJwt(req.user!);
    const result = await bookingService.getBookingById(id, userId, roleInfo);
    R.success(res, result, BOOKING_MESSAGES.BOOKING_FETCHED, req);
  }

  async getMyBookings(req: PaginationRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getBookingsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const { page, limit, skip } = req.pagination!;
    const result = await bookingService.getMyBookings(userId, { ...query, page, limit, skip });
    R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  }

  async getAdminBookingAnalytics(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    const query = validateWithSchema(
      adminBookingAnalyticsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await bookingService.getAdminBookingAnalytics(query);
    R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  }

  async updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingStatusSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.updateBookingStatus(
      id,
      userId,
      data.status,
      roleInfoFromJwt(req.user!),
      data.worker_response
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_STATUS_UPDATED, req);
  }

  async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;

    const data = validateWithSchema(
      cancelBookingReasonSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.cancelBooking(
      id,
      userId,
      data.reason,
      data.notes || "",
      roleInfoFromJwt(req.user!)
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_CANCELLED, req);
  }

  async updateBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.updateBooking(
      id,
      userId,
      data,
      roleInfoFromJwt(req.user!)
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_UPDATED, req);
  }

  async createDispute(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      createDisputeSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.createDispute(
      id,
      userId,
      data.reason,
      data.description,
      data.evidence_urls
    );
    R.success(res, result, BOOKING_MESSAGES.DISPUTE_CREATED, req);
  }

  async resolveDispute(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      resolveDisputeSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.resolveDispute(
      id,
      userId,
      data.resolution,
      data.resolution_notes,
      roleInfoFromJwt(req.user!)
    );
    R.success(res, result, BOOKING_MESSAGES.DISPUTE_RESOLVED, req);
  }
}

export const bookingController = new BookingController();
