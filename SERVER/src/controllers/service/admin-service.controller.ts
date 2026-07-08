import { Request, Response } from "express";
import { adminServiceService } from "../../services/service/admin-service.service";
import {
  createServiceSchema,
  updateServiceSchema,
  adminServiceQuerySchema,
} from "../../validations/service/admin-service.validation";
import { COMMON_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema, extractUserIdFromRequest } from "../../utils";

export class AdminServiceController {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      adminServiceQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const services = await adminServiceService.listServices(query);
    R.success(res, { services, count: services.length });
  }

  async create(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      createServiceSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const service = await adminServiceService.createService(input, adminId);
    R.created(res, { service });
  }

  async update(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      updateServiceSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const service = await adminServiceService.updateService(
      req.params.id,
      input,
      adminId
    );
    R.success(res, { service });
  }

  async deprecate(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const service = await adminServiceService.deprecateService(
      req.params.id,
      adminId
    );
    R.success(res, { service });
  }

  async reactivate(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const service = await adminServiceService.reactivateService(
      req.params.id,
      adminId
    );
    R.success(res, { service });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await adminServiceService.deleteService(req.params.id);
    R.success(res, { deleted: true });
  }
}

export const adminServiceController = new AdminServiceController();
