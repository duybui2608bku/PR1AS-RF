import { Request, Response } from "express";
import { serviceService } from "../../services/service/service.service";
import { searchServicesQuerySchema } from "../../validations/service/service.validation";
import { AppError } from "../../utils/AppError";
import { COMMON_MESSAGES } from "../../constants/messages";
import { R } from "../../utils/response";

/**
 * Helper: Validate query parameters với Zod schema
 */
const validateQuery = <T>(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: T;
      error?: { errors: { path: (string | number)[]; message: string }[] };
    };
  },
  query: unknown
): T => {
  const result = schema.safeParse(query);
  if (!result.success) {
    const details = result.error!.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, details);
  }
  return result.data as T;
};

export class ServiceController {
  /**
   * GET /api/services
   * Tìm kiếm dịch vụ theo category (query parameter)
   * @query category - Category của dịch vụ (ASSISTANCE hoặc COMPANIONSHIP)
   * @query is_active - Lọc theo trạng thái active (true/false, mặc định: true)
   */
  async searchServices(req: Request, res: Response): Promise<void> {
    const query = validateQuery(searchServicesQuerySchema, req.query);
    const services = await serviceService.searchServices(query);
    R.success(res, { services, count: services.length });
  }

  /**
   * GET /api/services/:id
   * Lấy thông tin dịch vụ theo ID
   */
  async getServiceById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const service = await serviceService.getServiceById(id);
    R.success(res, { service });
  }

  /**
   * GET /api/services/code/:code
   * Lấy thông tin dịch vụ theo code
   */
  async getServiceByCode(req: Request, res: Response): Promise<void> {
    const { code } = req.params;
    const service = await serviceService.getServiceByCode(code);
    R.success(res, { service });
  }
}

export const serviceController = new ServiceController();
