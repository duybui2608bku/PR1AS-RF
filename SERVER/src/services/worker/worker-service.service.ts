import {
  AUTHZ_MESSAGES,
  COMMON_MESSAGES,
  USER_MESSAGES,
} from "../../constants/messages";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import {
  UpsertWorkerServicePayload,
  workerServiceRepository,
} from "../../repositories/worker/worker-service.repository";
import { AppError } from "../../utils/AppError";
import {
  CreateWorkerServicesBody,
  UpdateWorkerServiceBody,
} from "../../validations/worker/worker-service.validation";
import {
  IWorkerServiceDocument,
  WorkerServicePricing,
} from "../../types/worker/worker-service";
import { UserRole } from "../../types/auth/user.types";
import { ValidationErrorDetail } from "../../types/common/error.types";

export interface CreateWorkerServicesInput {
  workerId: string;
  services: CreateWorkerServicesBody["services"];
}

export interface UpdateWorkerServiceInput {
  workerId: string;
  serviceId: string;
  body: UpdateWorkerServiceBody;
}

export interface DeleteWorkerServiceInput {
  workerId: string;
  serviceId: string;
}

class WorkerServiceService {
  private ensureNoDuplicateServiceIds(serviceIds: string[]): void {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    serviceIds.forEach((id) => {
      const normalized = id.trim();
      if (seen.has(normalized)) {
        duplicates.push(normalized);
      }
      seen.add(normalized);
    });

    if (duplicates.length) {
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
        {
          field: "services",
          message: `Duplicate service_id found: ${duplicates.join(", ")}`,
        },
      ]);
    }
  }

  private normalizePricing(
    pricing: WorkerServicePricing[],
    serviceIndex: number
  ): WorkerServicePricing[] {
    const pricingKeys = new Set<string>();
    const details: ValidationErrorDetail[] = [];

    pricing.forEach((item, idx) => {
      const key = `${item.unit}-${item.duration}`;
      if (pricingKeys.has(key)) {
        details.push({
          field: `services[${serviceIndex}].pricing[${idx}]`,
          message: "Duplicate pricing for the same unit and duration",
        });
      }
      pricingKeys.add(key);
    });

    if (details.length) {
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, details);
    }

    return pricing.map((item) => ({
      unit: item.unit,
      duration: item.duration,
      price: Number(item.price),
      currency: (item.currency || "USD").toUpperCase(),
    }));
  }

  private async ensureWorkerExists(workerId: string): Promise<void> {
    const worker = await userRepository.findById(workerId);
    if (!worker) {
      throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    }

    if (!worker.roles.includes(UserRole.WORKER)) {
      throw AppError.forbidden(AUTHZ_MESSAGES.FORBIDDEN);
    }
  }

  async createWorkerServices(
    input: CreateWorkerServicesInput
  ): Promise<IWorkerServiceDocument[]> {
    const { workerId, services } = input;

    await this.ensureWorkerExists(workerId);

    const serviceIds = services.map((s) => s.service_id);
    this.ensureNoDuplicateServiceIds(serviceIds);

    const dbServices = await serviceRepository.findActiveByIds(serviceIds);
    const serviceMap = new Map(dbServices.map((s) => [s._id.toString(), s]));

    if (dbServices.length !== serviceIds.length) {
      const missing = serviceIds.filter((id) => !serviceMap.has(id));
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
        {
          field: "services",
          message: `Service not found or inactive: ${missing.join(", ")}`,
        },
      ]);
    }

    const now = new Date();
    const upsertPayloads: UpsertWorkerServicePayload[] = services.map(
      (item, index) => {
        const service = serviceMap.get(item.service_id)!;

        return {
          serviceId: service._id.toString(),
          serviceCode: service.code,
          pricing: this.normalizePricing(item.pricing, index),
        };
      }
    );

    return workerServiceRepository.upsertManyForWorker(
      workerId,
      upsertPayloads,
      now
    );
  }

  async updateWorkerService(
    input: UpdateWorkerServiceInput
  ): Promise<IWorkerServiceDocument> {
    const { workerId, serviceId, body } = input;

    await this.ensureWorkerExists(workerId);

    const existing = await workerServiceRepository.findOneForWorker(
      workerId,
      serviceId
    );

    if (!existing) {
      throw AppError.notFound(COMMON_MESSAGES.NOT_FOUND);
    }

    const now = new Date();

    const normalizedPricing = body.pricing
      ? this.normalizePricing(body.pricing, 0)
      : undefined;

    const updated = await workerServiceRepository.updateForWorker(
      workerId,
      serviceId,
      {
        pricing: normalizedPricing,
        isActive: body.is_active,
        now,
      }
    );

    if (!updated) {
      throw AppError.notFound(COMMON_MESSAGES.NOT_FOUND);
    }

    return updated;
  }

  async deleteWorkerService(input: DeleteWorkerServiceInput): Promise<void> {
    const { workerId, serviceId } = input;

    await this.ensureWorkerExists(workerId);

    const deleted = await workerServiceRepository.deleteForWorker(
      workerId,
      serviceId
    );

    if (!deleted) {
      throw AppError.notFound(COMMON_MESSAGES.NOT_FOUND);
    }
  }

  async getWorkerServices(workerId: string): Promise<IWorkerServiceDocument[]> {
    await this.ensureWorkerExists(workerId);
    return workerServiceRepository.findAllForWorker(workerId);
  }
}

export const workerServiceService = new WorkerServiceService();
