import { Service } from "../../models/service/service";
import {
  IServiceDocument,
  ServiceCategory,
} from "../../types/service/service.type";

export class ServiceRepository {
  /**
   * Tìm kiếm dịch vụ theo category
   * @param category - Category của dịch vụ
   * @param isActive - Chỉ lấy dịch vụ đang active (mặc định: true)
   */
  async findByCategory(
    category: ServiceCategory,
    isActive: boolean = true
  ): Promise<IServiceDocument[]> {
    const query: { category: ServiceCategory; is_active?: boolean } = {
      category,
    };

    if (isActive !== undefined) {
      query.is_active = isActive;
    }

    return Service.find(query).sort({ created_at: -1 });
  }

  /**
   * Tìm kiếm tất cả dịch vụ
   * @param isActive - Chỉ lấy dịch vụ đang active (mặc định: true)
   */
  async findAll(isActive: boolean = true): Promise<IServiceDocument[]> {
    const query: { is_active?: boolean } = {};

    if (isActive !== undefined) {
      query.is_active = isActive;
    }

    return Service.find(query).sort({ created_at: -1 });
  }

  /**
   * Tìm dịch vụ theo ID
   */
  async findById(id: string): Promise<IServiceDocument | null> {
    return Service.findById(id);
  }

  /**
   * Tìm dịch vụ theo code
   */
  async findByCode(code: string): Promise<IServiceDocument | null> {
    return Service.findOne({ code: code.toUpperCase().trim() });
  }
}

export const serviceRepository = new ServiceRepository();
