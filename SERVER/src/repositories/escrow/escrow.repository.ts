import { Types } from "mongoose";
import { Escrow } from "../../models/escrow/escrow.model";
import { IEscrowDocument, CreateEscrowInput } from "../../types/escrow/escrow.types";
import { EscrowStatus } from "../../constants/escrow";

export interface EscrowQueryParams {
  client_id?: string;
  worker_id?: string;
  status?: EscrowStatus;
  page?: number;
  limit?: number;
  start_date?: Date;
  end_date?: Date;
}

export class EscrowRepository {
  async findById(id: string): Promise<IEscrowDocument | null> {
    return Escrow.findById(id)
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id")
      .populate("hold_transaction_id")
      .populate("release_transaction_id")
      .populate("refund_transaction_id");
  }

  async findByClientId(
    clientId: string,
    query: EscrowQueryParams
  ): Promise<{ escrows: IEscrowDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      client_id: new Types.ObjectId(clientId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.start_date || query.end_date) {
      filter.created_at = {};
      if (query.start_date) {
        filter.created_at.$gte = query.start_date;
      }
      if (query.end_date) {
        filter.created_at.$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [escrows, total] = await Promise.all([
      Escrow.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .populate("hold_transaction_id")
        .populate("release_transaction_id")
        .populate("refund_transaction_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Escrow.countDocuments(filter),
    ]);

    return {
      escrows: escrows as IEscrowDocument[],
      total,
    };
  }

  async findByWorkerId(
    workerId: string,
    query: EscrowQueryParams
  ): Promise<{ escrows: IEscrowDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      worker_id: new Types.ObjectId(workerId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.start_date || query.end_date) {
      filter.created_at = {};
      if (query.start_date) {
        filter.created_at.$gte = query.start_date;
      }
      if (query.end_date) {
        filter.created_at.$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [escrows, total] = await Promise.all([
      Escrow.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .populate("hold_transaction_id")
        .populate("release_transaction_id")
        .populate("refund_transaction_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Escrow.countDocuments(filter),
    ]);

    return {
      escrows: escrows as IEscrowDocument[],
      total,
    };
  }

  async findAll(query: EscrowQueryParams): Promise<{
    escrows: IEscrowDocument[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};

    if (query.client_id) {
      filter.client_id = new Types.ObjectId(query.client_id);
    }

    if (query.worker_id) {
      filter.worker_id = new Types.ObjectId(query.worker_id);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.start_date || query.end_date) {
      filter.created_at = {};
      if (query.start_date) {
        filter.created_at.$gte = query.start_date;
      }
      if (query.end_date) {
        filter.created_at.$lte = query.end_date;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [escrows, total] = await Promise.all([
      Escrow.find(filter)
        .populate("client_id", "email full_name")
        .populate("worker_id", "email full_name")
        .populate("booking_id")
        .populate("hold_transaction_id")
        .populate("release_transaction_id")
        .populate("refund_transaction_id")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Escrow.countDocuments(filter),
    ]);

    return {
      escrows: escrows as IEscrowDocument[],
      total,
    };
  }

  async findByBookingId(bookingId: string): Promise<IEscrowDocument | null> {
    return Escrow.findOne({ booking_id: new Types.ObjectId(bookingId) })
      .populate("client_id", "email full_name")
      .populate("worker_id", "email full_name")
      .populate("booking_id");
  }

  async create(
    data: CreateEscrowInput
  ): Promise<IEscrowDocument> {
    const escrow = new Escrow({
      ...data,
      status: EscrowStatus.HOLDING,
      held_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });
    return escrow.save();
  }
}

export const escrowRepository = new EscrowRepository();
