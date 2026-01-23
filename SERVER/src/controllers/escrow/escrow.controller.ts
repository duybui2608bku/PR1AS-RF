import { Response } from "express";
import { escrowService } from "../../services/escrow/escrow.service";
import { getEscrowsQuerySchema } from "../../validations/escrow/escrow.validation";
import { ESCROW_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import {
  AppError,
  extractUserIdFromRequest,
  R,
  validateWithSchema,
} from "../../utils";
import { userRepository } from "../../repositories";
import { UserRole } from "../../types";

export class EscrowController {
  async getEscrowById(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const { id } = req.params;
    const result = await escrowService.getEscrowById(
      id,
      userId,
      roleInfo.isAdmin
    );
    R.success(res, result, ESCROW_MESSAGES.ESCROW_FETCHED, req);
  }

  async getMyEscrows(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const query = validateWithSchema(
      getEscrowsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    let result;
    if (roleInfo.isWorker) {
      result = await escrowService.getEscrowsByWorker(userId, query);
    } else if (roleInfo.isClient) {
      result = await escrowService.getEscrowsByClient(userId, query);
    } else {
      throw AppError.forbidden();
    }

    R.success(res, result, ESCROW_MESSAGES.ESCROWS_FETCHED, req);
  }

  async getAllEscrows(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const userRoles = req.user.roles || [];
    if (!userRoles.includes(UserRole.ADMIN)) {
      throw AppError.forbidden();
    }

    const query = validateWithSchema(
      getEscrowsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await escrowService.getAllEscrows(query);
    R.success(res, result, ESCROW_MESSAGES.ESCROWS_FETCHED, req);
  }
}

export const escrowController = new EscrowController();
