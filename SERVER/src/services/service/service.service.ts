import { serviceRepository } from "../../repositories/service/service.repository";
import {
  IServiceDocument,
  ServiceCategory,
} from "../../types/service/service.type";
import { AppError } from "../../utils/AppError";

export interface SearchServicesQuery {
  category?: ServiceCategory;
  is_active?: boolean;
}

export class ServiceService {
  /**
   * Tìm kiếm dịch vụ theo query
   * @param query - Query parameters (category, is_active)
   */
  async searchServices(
    query: SearchServicesQuery
  ): Promise<IServiceDocument[]> {
    const { category, is_active = true } = query;

    if (category) {
      return serviceRepository.findByCategory(category, is_active);
    }

    return serviceRepository.findAll(is_active);
  }

  /**
   * Lấy dịch vụ theo ID
   */
  async getServiceById(id: string): Promise<IServiceDocument> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Không tìm thấy dịch vụ");
    }
    return service;
  }

  /**
   * Lấy dịch vụ theo code
   */
  async getServiceByCode(code: string): Promise<IServiceDocument> {
    const service = await serviceRepository.findByCode(code);
    if (!service) {
      throw AppError.notFound("Không tìm thấy dịch vụ");
    }
    return service;
  }
}

export const serviceService = new ServiceService();
