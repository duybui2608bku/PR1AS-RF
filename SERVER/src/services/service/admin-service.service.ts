import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  IServiceDocument,
  CreateServiceInput,
  UpdateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "../../constants/notification";
import { t } from "../../utils/i18n";

const WORKER_SETUP_LINK = "/worker/setup";

export class AdminServiceService {
  async listServices(
    filter: AdminServiceFilter
  ): Promise<IServiceDocument[]> {
    return serviceRepository.findAllAdmin(filter);
  }

  async createService(
    input: CreateServiceInput,
    adminId: string
  ): Promise<IServiceDocument> {
    const existing = await serviceRepository.findByCode(input.code);
    if (existing) {
      throw AppError.conflict(
        "Service code already exists",
        ErrorCode.SERVICE_CODE_EXISTS
      );
    }

    const service = await serviceRepository.create({
      ...input,
      created_by: adminId,
    });

    await this.notifyNewService(service);
    return service;
  }

  async updateService(
    id: string,
    input: UpdateServiceInput & { code?: string },
    adminId: string
  ): Promise<IServiceDocument> {
    if (input.code !== undefined) {
      throw AppError.badRequest("Service code cannot be changed");
    }

    const updated = await serviceRepository.updateById(id, {
      ...input,
      updated_by: adminId,
    });
    if (!updated) {
      throw AppError.notFound("Service not found");
    }
    return updated;
  }

  async deprecateService(
    id: string,
    adminId: string
  ): Promise<IServiceDocument> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Service not found");
    }
    if (!service.is_active) {
      return service;
    }

    const updated = await serviceRepository.setActiveState(
      id,
      false,
      new Date(),
      adminId
    );
    if (!updated) {
      throw AppError.notFound("Service not found");
    }

    await this.notifyDeprecatedService(updated);
    return updated;
  }

  async reactivateService(
    id: string,
    adminId: string
  ): Promise<IServiceDocument> {
    const updated = await serviceRepository.setActiveState(
      id,
      true,
      null,
      adminId
    );
    if (!updated) {
      throw AppError.notFound("Service not found");
    }
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Service not found");
    }

    const [workerCount, bookingCount] = await Promise.all([
      workerServiceRepository.countByServiceId(id),
      bookingRepository.countByServiceId(id),
    ]);

    if (workerCount > 0 || bookingCount > 0) {
      throw new AppError(
        "Service is in use; deprecate it instead of deleting",
        HTTP_STATUS.CONFLICT,
        ErrorCode.SERVICE_IN_USE,
        [
          { field: "worker_count", message: String(workerCount) },
          { field: "booking_count", message: String(bookingCount) },
        ]
      );
    }

    await serviceRepository.deleteById(id);
  }

  private async notifyDeprecatedService(
    service: IServiceDocument
  ): Promise<void> {
    const serviceId = String(service._id);
    const workerIds =
      await workerServiceRepository.findWorkerIdsByServiceId(serviceId);
    if (workerIds.length === 0) {
      return;
    }

    await notificationService.notify({
      recipient_ids: workerIds,
      type: NotificationType.SERVICE_DEPRECATED,
      category: NotificationCategory.SYSTEM,
      title: t("notif.service.deprecated.title", "vi"),
      body: t("notif.service.deprecated.body", "vi"),
      data: {
        service_id: serviceId,
        service_code: service.code,
        service_name: service.name.vi,
      },
      link: WORKER_SETUP_LINK,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      dedupe_key: `service_deprecated:${serviceId}`,
    });
  }

  private async notifyNewService(service: IServiceDocument): Promise<void> {
    const workerIds = await userRepository.findActiveWorkerIds();
    if (workerIds.length === 0) {
      return;
    }

    const serviceId = String(service._id);
    await notificationService.notify({
      recipient_ids: workerIds,
      type: NotificationType.SERVICE_ADDED,
      category: NotificationCategory.SYSTEM,
      title: t("notif.service.added.title", "vi"),
      body: t("notif.service.added.body", "vi"),
      data: {
        service_id: serviceId,
        service_code: service.code,
        service_name: service.name.vi,
      },
      link: WORKER_SETUP_LINK,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      dedupe_key: `service_added:${serviceId}`,
    });
  }
}

export const adminServiceService = new AdminServiceService();
