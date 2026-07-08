jest.mock("../../repositories/service/service.repository", () => ({
  serviceRepository: {
    findByCode: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    setActiveState: jest.fn(),
    deleteById: jest.fn(),
    findAllAdmin: jest.fn(),
  },
}));
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    countByServiceId: jest.fn(),
    findWorkerIdsByServiceId: jest.fn(),
  },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { countByServiceId: jest.fn() },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { findActiveWorkerIds: jest.fn() },
}));
jest.mock("../notification/notification.service", () => ({
  notificationService: { notify: jest.fn() },
}));

import { adminServiceService } from "./admin-service.service";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  NotificationType,
  NotificationChannel,
} from "../../constants/notification";
import { ServiceCategory, CreateServiceInput } from "../../types/service/service.type";

const baseInput: CreateServiceInput = {
  code: "NEWCODE",
  category: ServiceCategory.VIRTUAL,
  icon: "Star",
  name: { en: "New", vi: "Mới" },
};

describe("adminServiceService.createService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a duplicate code with a 409", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue({ id: "x" });

    await expect(
      adminServiceService.createService(baseInput, "admin1")
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(serviceRepository.create).not.toHaveBeenCalled();
  });

  it("creates with created_by and notifies active workers in-app only", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (serviceRepository.create as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "NEWCODE",
      name: { vi: "Mới" },
    });
    (userRepository.findActiveWorkerIds as jest.Mock).mockResolvedValue([
      "w1",
      "w2",
    ]);

    await adminServiceService.createService(baseInput, "admin1");

    expect(serviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NEWCODE", created_by: "admin1" })
    );
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_ids: ["w1", "w2"],
        type: NotificationType.SERVICE_ADDED,
        channels: [NotificationChannel.IN_APP],
        dedupe_key: "service_added:svc1",
      })
    );
  });

  it("skips notify when there are no active workers", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (serviceRepository.create as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "NEWCODE",
      name: { vi: "Mới" },
    });
    (userRepository.findActiveWorkerIds as jest.Mock).mockResolvedValue([]);

    await adminServiceService.createService(baseInput, "admin1");

    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});
