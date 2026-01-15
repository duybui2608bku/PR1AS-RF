import { Types } from "mongoose";
import { Booking } from "../../models/booking/booking.model";
import {
  IBookingDocument,
  CreateBookingInput,
  BookingQuery,
} from "../../types/booking/booking.types";
import { BookingStatus, BookingPaymentStatus } from "../../constants/booking";

export class BookingRepository {
  async create(data: CreateBookingInput): Promise<IBookingDocument> {
    const booking = new Booking({
      ...data,
      status: BookingStatus.PENDING,
      payment_status: BookingPaymentStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return booking.save();
  }

  async findById(id: string): Promise<IBookingDocument | null> {
    return Booking.findById(id)
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("worker_service_id")
      .populate("service_id")
      .populate("escrow_id");
  }

  async findByClientId(
    clientId: string,
    query: BookingQuery
  ): Promise<{ bookings: IBookingDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      client_id: new Types.ObjectId(clientId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.payment_status) {
      filter.payment_status = query.payment_status;
    }

    if (query.service_code) {
      filter.service_code = query.service_code.toUpperCase().trim();
    }

    if (query.start_date || query.end_date) {
      filter["schedule.start_time"] = {};
      if (query.start_date) {
        filter["schedule.start_time"].$gte = query.start_date;
      }
      if (query.end_date) {
        filter["schedule.start_time"].$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("worker_service_id")
        .populate("service_id")
        .populate("escrow_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings: bookings as IBookingDocument[],
      total,
    };
  }

  async findByWorkerId(
    workerId: string,
    query: BookingQuery
  ): Promise<{ bookings: IBookingDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      worker_id: new Types.ObjectId(workerId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.payment_status) {
      filter.payment_status = query.payment_status;
    }

    if (query.service_code) {
      filter.service_code = query.service_code.toUpperCase().trim();
    }

    if (query.start_date || query.end_date) {
      filter["schedule.start_time"] = {};
      if (query.start_date) {
        filter["schedule.start_time"].$gte = query.start_date;
      }
      if (query.end_date) {
        filter["schedule.start_time"].$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("worker_service_id")
        .populate("service_id")
        .populate("escrow_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings: bookings as IBookingDocument[],
      total,
    };
  }

  async findAll(query: BookingQuery): Promise<{
    bookings: IBookingDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};

    if (query.client_id) {
      filter.client_id = new Types.ObjectId(query.client_id.toString());
    }

    if (query.worker_id) {
      filter.worker_id = new Types.ObjectId(query.worker_id.toString());
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.payment_status) {
      filter.payment_status = query.payment_status;
    }

    if (query.service_code) {
      filter.service_code = query.service_code.toUpperCase().trim();
    }

    if (query.start_date || query.end_date) {
      filter["schedule.start_time"] = {};
      if (query.start_date) {
        filter["schedule.start_time"].$gte = query.start_date;
      }
      if (query.end_date) {
        filter["schedule.start_time"].$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("worker_service_id")
        .populate("service_id")
        .populate("escrow_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings: bookings as IBookingDocument[],
      total,
    };
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    updateData: Partial<IBookingDocument>
  ): Promise<IBookingDocument | null> {
    return Booking.findByIdAndUpdate(
      id,
      {
        ...updateData,
        status,
        updated_at: new Date(),
      },
      { new: true }
    )
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("worker_service_id")
      .populate("service_id")
      .populate("escrow_id");
  }

  async update(
    id: string,
    updateData: Partial<IBookingDocument>
  ): Promise<IBookingDocument | null> {
    return Booking.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updated_at: new Date(),
      },
      { new: true }
    )
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("worker_service_id")
      .populate("service_id")
      .populate("escrow_id");
  }

  async findByEscrowId(escrowId: string): Promise<IBookingDocument | null> {
    return Booking.findOne({ escrow_id: new Types.ObjectId(escrowId) })
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("worker_service_id")
      .populate("service_id");
  }

  async checkScheduleConflict(
    workerId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const filter: Record<string, unknown> = {
      worker_id: new Types.ObjectId(workerId),
      status: {
        $in: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
        ],
      },
      $or: [
        {
          "schedule.start_time": {
            $gte: startTime,
            $lt: endTime,
          },
        },
        {
          "schedule.end_time": {
            $gt: startTime,
            $lte: endTime,
          },
        },
        {
          "schedule.start_time": { $lte: startTime },
          "schedule.end_time": { $gte: endTime },
        },
      ],
    };

    if (excludeBookingId) {
      filter._id = { $ne: new Types.ObjectId(excludeBookingId) };
    }

    const conflict = await Booking.findOne(filter);
    return !!conflict;
  }
}

export const bookingRepository = new BookingRepository();
