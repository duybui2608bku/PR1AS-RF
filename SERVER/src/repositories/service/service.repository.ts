import { Service } from "../../models/service/service";
import {
  IServiceDocument,
  ServiceCategory,
  CreateServiceInput,
  UpdateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";

export class ServiceRepository {
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

  async findAll(isActive: boolean = true): Promise<IServiceDocument[]> {
    const query: { is_active?: boolean } = {};

    if (isActive !== undefined) {
      query.is_active = isActive;
    }

    return Service.find(query).sort({ created_at: -1 });
  }

  async findById(id: string): Promise<IServiceDocument | null> {
    return Service.findById(id);
  }

  async findByCode(code: string): Promise<IServiceDocument | null> {
    return Service.findOne({ code: code.toUpperCase().trim() });
  }

  async findActiveByIds(ids: string[]): Promise<IServiceDocument[]> {
    if (!ids.length) {
      return [];
    }
    return Service.find({
      _id: { $in: ids },
      is_active: true,
    });
  }

  async findAllAdmin(filter: AdminServiceFilter): Promise<IServiceDocument[]> {
    const query: { category?: ServiceCategory; is_active?: boolean } = {};
    if (filter.category !== undefined) {
      query.category = filter.category;
    }
    if (filter.is_active !== undefined) {
      query.is_active = filter.is_active;
    }
    return Service.find(query).sort({ created_at: -1 });
  }

  async create(
    data: CreateServiceInput & { created_by: string }
  ): Promise<IServiceDocument> {
    return Service.create({ ...data, is_active: true, deprecated_at: null });
  }

  async updateById(
    id: string,
    patch: UpdateServiceInput & { updated_by: string }
  ): Promise<IServiceDocument | null> {
    return Service.findByIdAndUpdate(
      id,
      { $set: { ...patch, updated_at: new Date() } },
      { new: true, runValidators: true }
    );
  }

  async setActiveState(
    id: string,
    isActive: boolean,
    deprecatedAt: Date | null,
    updatedBy: string
  ): Promise<IServiceDocument | null> {
    return Service.findByIdAndUpdate(
      id,
      {
        $set: {
          is_active: isActive,
          deprecated_at: deprecatedAt,
          updated_by: updatedBy,
          updated_at: new Date(),
        },
      },
      { new: true }
    );
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await Service.findByIdAndDelete(id);
    return result !== null;
  }
}

export const serviceRepository = new ServiceRepository();
