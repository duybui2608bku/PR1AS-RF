import { Types } from "mongoose";
import dayjs from "dayjs";
import {
  escrowRepository,
  EscrowQueryParams,
} from "../../repositories/escrow/escrow.repository";
import { IEscrowDocument } from "../../types/escrow/escrow.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ESCROW_MESSAGES } from "../../constants/messages";
import { PaginationHelper } from "../../utils/pagination";
import { IPagination } from "../../types/common/pagination.type";
import { getPagination } from "../../utils/pagination";
import {
  EscrowStatus,
  EscrowReleaseReason,
  EscrowRefundReason,
  ESCROW_FEE,
} from "../../constants/escrow";
import { walletService } from "../wallet/wallet.service";

export class EscrowService {
  async getEscrowById(
    escrowId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<IEscrowDocument> {
    const escrow = await escrowRepository.findById(escrowId);
    if (!escrow) {
      throw new AppError(
        ESCROW_MESSAGES.ESCROW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.ESCROW_NOT_FOUND
      );
    }

    const isOwner =
      escrow.client_id.toString() === userId ||
      escrow.worker_id.toString() === userId;

    if (!isAdmin && !isOwner) {
      throw new AppError(
        ESCROW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.ESCROW_UNAUTHORIZED_ACCESS
      );
    }

    return escrow;
  }

  async getEscrowsByClient(
    clientId: string,
    query: EscrowQueryParams
  ): Promise<{
    data: IEscrowDocument[];
    pagination: IPagination;
  }> {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const { escrows, total } = await escrowRepository.findByClientId(clientId, {
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(escrows, { page, limit, skip }, total);
  }

  async getEscrowsByWorker(
    workerId: string,
    query: EscrowQueryParams
  ): Promise<{
    data: IEscrowDocument[];
    pagination: ReturnType<typeof PaginationHelper.format>["pagination"];
  }> {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const { escrows, total } = await escrowRepository.findByWorkerId(workerId, {
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(escrows, { page, limit, skip }, total);
  }

  async getAllEscrows(query: EscrowQueryParams): Promise<{
    data: IEscrowDocument[];
    pagination: ReturnType<typeof PaginationHelper.format>["pagination"];
  }> {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const { escrows, total } = await escrowRepository.findAll({
      ...query,
      page,
      limit,
    });

    return PaginationHelper.format(escrows, { page, limit, skip }, total);
  }

  async releaseEscrowForCompletedBooking(
    bookingId: string
  ): Promise<{ workerPayout: number; platformFee: number; releaseTransactionId: string } | null> {
    const escrow = await escrowRepository.findByBookingId(bookingId);
    if (!escrow) {
      return null;
    }

    if (escrow.status !== EscrowStatus.HOLDING) {
      throw new AppError(
        ESCROW_MESSAGES.ESCROW_ALREADY_RELEASED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.ESCROW_RELEASE_FAILED
      );
    }

    const workerId =
      typeof escrow.worker_id === "object" && escrow.worker_id?._id
        ? escrow.worker_id._id.toString()
        : String(escrow.worker_id);

    const releaseTransactionId = await walletService.releasePayoutToWorker(
      workerId,
      escrow.worker_payout,
      bookingId,
      `Payout for completed booking ${bookingId}`
    );

    const escrowIdValue = escrow._id;
    const escrowId =
      escrowIdValue instanceof Types.ObjectId
        ? escrowIdValue
        : new Types.ObjectId(String(escrowIdValue));

    await escrowRepository.releaseEscrow({
      escrow_id: escrowId,
      release_reason: EscrowReleaseReason.BOOKING_COMPLETED,
      release_transaction_id: new Types.ObjectId(releaseTransactionId),
    });

    return {
      workerPayout: escrow.worker_payout,
      platformFee: escrow.platform_fee,
      releaseTransactionId,
    };
  }

  async refundEscrowForCancelledBooking(
    bookingId: string,
    clientId: string,
    scheduleStartTime: Date
  ): Promise<{ refundAmount: number; penaltyAmount: number } | null> {
    const escrow = await escrowRepository.findByBookingId(bookingId);
    if (!escrow || escrow.status !== EscrowStatus.HOLDING) {
      return null;
    }

    const startTime = dayjs(scheduleStartTime);
    const hoursUntilStart = startTime.diff(dayjs(), "hour");
    const isFreeCancellation =
      hoursUntilStart >= ESCROW_FEE.FREE_CANCELLATION_HOURS;

    let refundAmount: number;
    let penaltyAmount: number;
    if (isFreeCancellation) {
      refundAmount = escrow.amount;
      penaltyAmount = 0;
    } else {
      penaltyAmount = Math.round(
        (escrow.amount * ESCROW_FEE.CANCELLATION_PENALTY_PERCENT) / 100
      );
      refundAmount = escrow.amount - penaltyAmount;
    }

    const refundTransactionId = await walletService.refundBalanceToClient(
      clientId,
      refundAmount,
      bookingId,
      `Refund for cancelled booking ${bookingId}`
    );

    const escrowIdValue = escrow._id;
    const escrowId =
      escrowIdValue instanceof Types.ObjectId
        ? escrowIdValue
        : new Types.ObjectId(String(escrowIdValue));

    await escrowRepository.refundEscrow({
      escrow_id: escrowId,
      refund_reason: EscrowRefundReason.BOOKING_CANCELLED,
      refund_amount: refundAmount,
      penalty_amount: penaltyAmount,
      refund_transaction_id: new Types.ObjectId(refundTransactionId),
    });

    return { refundAmount, penaltyAmount };
  }
}

export const escrowService = new EscrowService();
