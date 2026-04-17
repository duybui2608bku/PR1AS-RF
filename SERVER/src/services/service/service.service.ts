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
  async searchServices(
    query: SearchServicesQuery
  ): Promise<IServiceDocument[]> {
    const { category, is_active = true } = query;

    if (category) {
      return serviceRepository.findByCategory(category, is_active);
    }

    return serviceRepository.findAll(is_active);
  }

  async getServiceById(id: string): Promise<IServiceDocument> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Service not found");
    }
    return service;
  }
  async getServiceByCode(code: string): Promise<IServiceDocument> {
    const service = await serviceRepository.findByCode(code);
    if (!service) {
      throw AppError.notFound("Service not found");
    }
    return service;
  }
}

export const serviceService = new ServiceService();
