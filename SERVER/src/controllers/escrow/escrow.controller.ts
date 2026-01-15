import { Request, Response } from "express";
import { escrowService } from "../../services/escrow/escrow.service";
import { getEscrowsQuerySchema } from "../../validations/escrow/escrow.validation";
import { ESCROW_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";

export class EscrowController {
  async getEscrowById(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const userRoles = req.user.roles || [];
    const result = await escrowService.getEscrowById(
      id,
      req.user.sub,
      userRoles
    );
    R.success(res, result, ESCROW_MESSAGES.ESCROW_FETCHED, req);
  }

  async getMyEscrows(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const query = validateWithSchema(
      getEscrowsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const isWorker = userRoles.includes("worker");
    const isClient = userRoles.includes("client");

    let result;
    if (isWorker) {
      result = await escrowService.getEscrowsByWorker(req.user.sub, query);
    } else if (isClient) {
      result = await escrowService.getEscrowsByClient(req.user.sub, query);
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
    if (!userRoles.includes("admin")) {
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
