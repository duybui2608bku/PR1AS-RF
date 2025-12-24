import { Request, Response } from "express";
import { serviceService } from "../../services/service/service.service";
import { searchServicesQuerySchema } from "../../validations/service/service.validation";
import { COMMON_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema } from "../../utils";

export class ServiceController {
  async searchServices(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      searchServicesQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const services = await serviceService.searchServices(query);
    R.success(res, { services, count: services.length });
  }

  async getServiceById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const service = await serviceService.getServiceById(id);
    R.success(res, { service });
  }

  async getServiceByCode(req: Request, res: Response): Promise<void> {
    const { code } = req.params;
    const service = await serviceService.getServiceByCode(code);
    R.success(res, { service });
  }
}

export const serviceController = new ServiceController();
