import { Response } from "express";
import { bookingService } from "../../services/booking/booking.service";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingReasonSchema,
  updateBookingSchema,
  getBookingsQuerySchema,
  createDisputeSchema,
  resolveDisputeSchema,
} from "../../validations/booking/booking.validation";
import { BOOKING_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import {
  R,
  validateWithSchema,
  extractUserIdFromRequest,
  AppError,
} from "../../utils";
import { userRepository } from "../../repositories/auth/user.repository";
import { Types } from "mongoose";
import { PaginationRequest } from "../../middleware";
import { UserRole } from "../../types/auth/user.types";

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
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
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
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const requestedRole = query.role || roleInfo.lastActiveRole;
    const baseQuery = { ...query, page, limit, skip };
    let result;
    if (
      requestedRole === UserRole.WORKER &&
      roleInfo.roles.includes(UserRole.WORKER)
    ) {
      result = await bookingService.getBookingsByWorker({
        ...baseQuery,
        worker_id: new Types.ObjectId(userId),
      });
    } else if (
      requestedRole === UserRole.CLIENT &&
      roleInfo.roles.includes(UserRole.CLIENT)
    ) {
      result = await bookingService.getBookingsByClient({
        ...baseQuery,
        client_id: new Types.ObjectId(userId),
      });
    } else {
      throw AppError.forbidden();
    }

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

    const roleInfo = await userRepository.getUserRoleInfoById(userId);

    const result = await bookingService.updateBookingStatus(
      id,
      userId,
      data.status,
      roleInfo,
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

    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const result = await bookingService.cancelBooking(
      id,
      userId,
      data.reason,
      data.notes || "",
      roleInfo
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_CANCELLED, req);
  }

  async updateBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
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
      roleInfo
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

    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const result = await bookingService.resolveDispute(
      id,
      userId,
      data.resolution,
      data.resolution_notes,
      data.refund_amount,
      roleInfo
    );
    R.success(res, result, BOOKING_MESSAGES.DISPUTE_RESOLVED, req);
  }
}

export const bookingController = new BookingController();
