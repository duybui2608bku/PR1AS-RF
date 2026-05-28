import mongoose, { Types, PopulateOptions, ClientSession } from "mongoose";
import { Booking } from "../../models/booking/booking.model";
import { User } from "../../models/auth/user.model";
import { WorkerBlackout } from "../../models/worker/worker-blackout.model";
import {
  AdminBookingAnalyticsQuery,
  AdminBookingAnalyticsRaw,
  IBookingDocument,
  CreateBookingInput,
  BookingQuery,
} from "../../types/booking/booking.types";
import { PaginatedResponse } from "../../utils/pagination";
import {
  BookingStatus,
  BOOKING_SCHEDULE_BLOCKING_STATUSES,
  CancellationReason,
  CancelledBy,
} from "../../constants/booking";
import { PaginationHelper } from "../../utils";
import { UserRole, UserStatus } from "../../types/auth/user.types";

const BOOKING_POPULATE: PopulateOptions[] = [
  { path: "client_id", select: "email full_name" },
  { path: "worker_id", select: "email full_name" },
  { path: "worker_service_id" },
  { path: "service_id" },
];

export enum CreateBookingFailureReason {
  SCHEDULE_CONFLICT = "SCHEDULE_CONFLICT",
  WORKER_INELIGIBLE = "WORKER_INELIGIBLE",
}

export type CreateBookingIfNoConflictResult =
  | { booking: IBookingDocument; failureReason: null }
  | { booking: null; failureReason: CreateBookingFailureReason };

export class BookingRepository {
  private isDuplicateActiveStartTimeError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;

    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      message?: string;
    };

    if (mongoError.code !== 11000) return false;
    if (mongoError.message?.includes("uniq_active_booking_worker_start_time")) {
      return true;
    }

    return Boolean(
      mongoError.keyPattern?.worker_id &&
      mongoError.keyPattern?.["schedule.start_time"]
    );
  }

  async countActiveBookingsForUser(userId: string): Promise<number> {
    return Booking.countDocuments({
      $or: [
        { client_id: new Types.ObjectId(userId) },
        { worker_id: new Types.ObjectId(userId) },
      ],
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
    });
  }

  async countOpenDisputesForUser(userId: string): Promise<number> {
    return Booking.countDocuments({
      $or: [
        { client_id: new Types.ObjectId(userId) },
        { worker_id: new Types.ObjectId(userId) },
      ],
      status: BookingStatus.DISPUTED,
      "dispute.resolution": null,
    });
  }

  async hasConfirmedBookingBetweenUsers(
    userAId: string,
    userBId: string
  ): Promise<boolean> {
    return Booking.exists({
      $or: [
        {
          client_id: new Types.ObjectId(userAId),
          worker_id: new Types.ObjectId(userBId),
        },
        {
          client_id: new Types.ObjectId(userBId),
          worker_id: new Types.ObjectId(userAId),
        },
      ],
      confirmed_at: { $ne: null },
      status: {
        $nin: [
          BookingStatus.CANCELLED,
          BookingStatus.REJECTED,
          BookingStatus.EXPIRED,
        ],
      },
    }).then(Boolean);
  }

  async hasConfirmedBookingForPair(
    clientId: string,
    workerId: string
  ): Promise<boolean> {
    return Booking.exists({
      client_id: new Types.ObjectId(clientId),
      worker_id: new Types.ObjectId(workerId),
      confirmed_at: { $ne: null },
      status: {
        $nin: [
          BookingStatus.CANCELLED,
          BookingStatus.REJECTED,
          BookingStatus.EXPIRED,
        ],
      },
    }).then(Boolean);
  }

  async getConfirmedChatPeerIdsForRole(
    userId: string,
    role: "client" | "worker"
  ): Promise<string[]> {
    const field = role === "client" ? "worker_id" : "client_id";
    const filter =
      role === "client"
        ? { client_id: new Types.ObjectId(userId), confirmed_at: { $ne: null } }
        : {
            worker_id: new Types.ObjectId(userId),
            confirmed_at: { $ne: null },
          };

    const peerIds = await Booking.distinct(field, filter);
    return peerIds.map((id) => id.toString());
  }

  private buildFilter(query: BookingQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.client_id) filter.client_id = query.client_id;
    if (query.worker_id) filter.worker_id = query.worker_id;
    if (query.status) filter.status = query.status;
    if (query.service_code) {
      filter.service_code = query.service_code.toUpperCase().trim();
    }

    if (query.start_date || query.end_date) {
      const scheduleFilter: { $gte?: Date; $lte?: Date } = {};
      if (query.start_date) scheduleFilter.$gte = query.start_date;
      if (query.end_date) scheduleFilter.$lte = query.end_date;
      filter["schedule.start_time"] = scheduleFilter;
    }

    return filter;
  }

  private buildCreatedAtFilter(
    query: Pick<AdminBookingAnalyticsQuery, "start_date" | "end_date">
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.start_date || query.end_date) {
      const createdAtFilter: { $gte?: Date; $lte?: Date } = {};
      if (query.start_date) createdAtFilter.$gte = query.start_date;
      if (query.end_date) createdAtFilter.$lte = query.end_date;
      filter.created_at = createdAtFilter;
    }

    return filter;
  }

  private async findWithPagination(
    filter: Record<string, unknown>,
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const { page, limit, skip } = query;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate(BOOKING_POPULATE)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return PaginationHelper.format(
      bookings as IBookingDocument[],
      { page, limit, skip },
      total
    );
  }

  async create(
    data: CreateBookingInput,
    session?: ClientSession
  ): Promise<IBookingDocument> {
    const booking = new Booking({
      ...data,
      status: BookingStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await booking.save({ session });
    const query = Booking.findById(saved._id).populate(BOOKING_POPULATE);
    if (session) query.session(session);
    return query as Promise<IBookingDocument>;
  }

  // Serialize per-worker booking creation by taking a write lock on the worker
  // document, then re-check availability and insert in the same transaction.
  async createIfNoConflict(
    data: CreateBookingInput
  ): Promise<CreateBookingIfNoConflictResult> {
    const session = await mongoose.startSession();

    try {
      let result: CreateBookingIfNoConflictResult = {
        booking: null,
        failureReason: CreateBookingFailureReason.SCHEDULE_CONFLICT,
      };

      await session.withTransaction(async () => {
        const worker = await User.findOneAndUpdate(
          {
            _id: new Types.ObjectId(data.worker_id.toString()),
            status: UserStatus.ACTIVE,
            verify_email: true,
            roles: UserRole.WORKER,
          },
          { $inc: { booking_lock_version: 1 } },
          { new: true, session }
        )
          .select("_id")
          .lean();

        if (!worker) {
          result = {
            booking: null,
            failureReason: CreateBookingFailureReason.WORKER_INELIGIBLE,
          };
          return;
        }

        const conflict = await this.checkScheduleConflict(
          data.worker_id.toString(),
          data.schedule.start_time,
          data.schedule.end_time,
          undefined,
          session
        );

        if (conflict) {
          result = {
            booking: null,
            failureReason: CreateBookingFailureReason.SCHEDULE_CONFLICT,
          };
          return;
        }

        result = {
          booking: await this.create(data, session),
          failureReason: null,
        };
      });

      return result;
    } catch (error) {
      if (this.isDuplicateActiveStartTimeError(error)) {
        return {
          booking: null,
          failureReason: CreateBookingFailureReason.SCHEDULE_CONFLICT,
        };
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findById(id: string): Promise<IBookingDocument | null> {
    return Booking.findById(id).populate(BOOKING_POPULATE);
  }

  async findManyByIds(ids: string[]): Promise<IBookingDocument[]> {
    if (ids.length === 0) return [];

    return Booking.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    })
      .populate(BOOKING_POPULATE)
      .lean() as Promise<IBookingDocument[]>;
  }

  async findByClientId(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const filter = this.buildFilter({ ...query, client_id: query.client_id });
    return this.findWithPagination(filter, query);
  }

  async findByWorkerId(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const filter = this.buildFilter({ ...query, worker_id: query.worker_id });
    return this.findWithPagination(filter, query);
  }

  async findAll(
    query: BookingQuery
  ): Promise<PaginatedResponse<IBookingDocument>> {
    const filter = this.buildFilter(query);
    return this.findWithPagination(filter, query);
  }

  async getAdminAnalytics(
    query: AdminBookingAnalyticsQuery
  ): Promise<AdminBookingAnalyticsRaw> {
    const filter = this.buildCreatedAtFilter(query);

    const [
      statusCounts,
      createdByDate,
      completionByDate,
      recentBookings,
      total,
    ] = await Promise.all([
      Booking.aggregate<{ _id: BookingStatus; count: number }>([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Booking.aggregate<{ _id: string; count: number }>([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$created_at",
                format: "%Y-%m-%d",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate<{ _id: string; total: number; completed: number }>([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$created_at",
                format: "%Y-%m-%d",
              },
            },
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", BookingStatus.COMPLETED] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.find(filter)
        .populate(BOOKING_POPULATE)
        .sort({ created_at: -1 })
        .limit(query.recent_limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      total,
      status_counts: statusCounts.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      created_by_date: createdByDate.map((item) => ({
        date: item._id,
        count: item.count,
      })),
      completion_by_date: completionByDate.map((item) => ({
        date: item._id,
        total: item.total,
        completed: item.completed,
      })),
      recent_bookings: recentBookings as IBookingDocument[],
    };
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    updateData: Partial<IBookingDocument>,
    session?: ClientSession
  ): Promise<IBookingDocument | null> {
    return Booking.findByIdAndUpdate(
      id,
      { ...updateData, status, updated_at: new Date() },
      { new: true, session }
    ).populate(BOOKING_POPULATE);
  }

  async expirePendingBooking(id: string): Promise<IBookingDocument | null> {
    const now = new Date();
    return Booking.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        status: BookingStatus.PENDING,
      },
      {
        status: BookingStatus.EXPIRED,
        updated_at: now,
        cancellation: {
          cancelled_at: now,
          cancelled_by: CancelledBy.SYSTEM,
          reason: CancellationReason.WORKER_UNAVAILABLE,
          notes: "Worker did not confirm before the deadline",
        },
      },
      { new: true }
    ).populate(BOOKING_POPULATE);
  }

  async findPendingBookingsForExpirationScan(
    now: Date,
    shortNoticeConfirmMinutes: number,
    confirmDeadlineBeforeStartHours: number,
    limit = 100
  ): Promise<IBookingDocument[]> {
    const shortNoticeCreatedCutoff = new Date(
      now.getTime() - shortNoticeConfirmMinutes * 60 * 1000
    );
    const scheduleDeadlineCutoff = new Date(
      now.getTime() + confirmDeadlineBeforeStartHours * 60 * 60 * 1000
    );

    return Booking.find({
      status: BookingStatus.PENDING,
      $or: [
        { created_at: { $lte: shortNoticeCreatedCutoff } },
        { "schedule.start_time": { $lte: scheduleDeadlineCutoff } },
      ],
    })
      .populate(BOOKING_POPULATE)
      .sort({ "schedule.start_time": 1, created_at: 1 })
      .limit(limit);
  }

  async findUpcomingBookingsForReminder(
    now: Date,
    thresholdHours: number,
    limit = 200
  ): Promise<IBookingDocument[]> {
    const threshold = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);
    return Booking.find({
      status: {
        $in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      },
      "schedule.start_time": {
        $gt: now,
        $lte: threshold,
      },
    })
      .populate(BOOKING_POPULATE)
      .sort({ "schedule.start_time": 1 })
      .limit(limit);
  }

  async update(
    id: string,
    updateData: Partial<IBookingDocument>,
    session?: ClientSession
  ): Promise<IBookingDocument | null> {
    return Booking.findByIdAndUpdate(
      id,
      { ...updateData, updated_at: new Date() },
      { new: true, session }
    ).populate(BOOKING_POPULATE);
  }

  async checkScheduleConflict(
    workerId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
    session?: ClientSession
  ): Promise<boolean> {
    const filter: Record<string, unknown> = {
      worker_id: new Types.ObjectId(workerId),
      // PENDING counts as a conflict so two clients cannot race to book the
      // same slot. A worker confirming the second booking later would
      // otherwise look fine here and only fail at confirmation time, leaving
      // the rejected client confused and the worker holding a useless slot.
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
      $or: [
        { "schedule.start_time": { $gte: startTime, $lt: endTime } },
        { "schedule.end_time": { $gt: startTime, $lte: endTime } },
        {
          "schedule.start_time": { $lte: startTime },
          "schedule.end_time": { $gte: endTime },
        },
      ],
    };

    if (excludeBookingId) {
      filter._id = { $ne: new Types.ObjectId(excludeBookingId) };
    }

    const bookingQuery = Booking.exists(filter);
    if (session) bookingQuery.session(session);
    const hasBookingConflict = await bookingQuery.then(Boolean);
    if (hasBookingConflict) return true;

    // Half-open overlap on the worker's declared off-days. start < end ∧
    // end > start covers every overlap variant in one shot.
    const blackoutQuery = WorkerBlackout.exists({
      worker_id: new Types.ObjectId(workerId),
      start_time: { $lt: endTime },
      end_time: { $gt: startTime },
    });
    if (session) blackoutQuery.session(session);
    return blackoutQuery.then(Boolean);
  }

  async findConflictsForWorkerInWindow(
    workerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ start_time: Date; end_time: Date }>> {
    const conflicts = await Booking.find({
      worker_id: new Types.ObjectId(workerId),
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
      "schedule.start_time": { $lt: endTime },
      "schedule.end_time": { $gt: startTime },
    })
      .select("schedule.start_time schedule.end_time")
      .lean();

    return conflicts.map((booking) => ({
      start_time: booking.schedule.start_time,
      end_time: booking.schedule.end_time,
    }));
  }

  async findConflictsForWorkersInWindow(
    workerIds: string[],
    startTime: Date,
    endTime: Date
  ): Promise<Array<{ worker_id: string; start_time: Date; end_time: Date }>> {
    if (!workerIds.length) return [];

    const conflicts = await Booking.find({
      worker_id: { $in: workerIds.map((id) => new Types.ObjectId(id)) },
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
      "schedule.start_time": { $lt: endTime },
      "schedule.end_time": { $gt: startTime },
    })
      .select("worker_id schedule.start_time schedule.end_time")
      .lean();

    return conflicts.map((booking) => ({
      worker_id: booking.worker_id.toString(),
      start_time: booking.schedule.start_time,
      end_time: booking.schedule.end_time,
    }));
  }

  async findScheduleByWorkerId(
    workerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<
    Array<{
      _id: Types.ObjectId;
      schedule: { start_time: Date; end_time: Date };
      status: BookingStatus;
    }>
  > {
    const bookings = await Booking.find({
      worker_id: new Types.ObjectId(workerId),
      status: {
        $in: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
          BookingStatus.PENDING_CLIENT_ACCEPTANCE,
          BookingStatus.DISPUTED,
        ],
      },
      "schedule.start_time": { $lt: endTime },
      "schedule.end_time": { $gt: startTime },
    })
      .select("_id schedule.start_time schedule.end_time status")
      .sort({ "schedule.start_time": 1 })
      .lean();

    return bookings.map((booking) => ({
      _id: booking._id,
      schedule: {
        start_time: booking.schedule.start_time,
        end_time: booking.schedule.end_time,
      },
      status: booking.status as BookingStatus,
    }));
  }
}

export const bookingRepository = new BookingRepository();
