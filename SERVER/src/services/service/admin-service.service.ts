import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  IServiceDocument,
  CreateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
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
