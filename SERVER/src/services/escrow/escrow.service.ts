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
import { getPagination } from "../../func/pagination.func";

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
}

export const escrowService = new EscrowService();
