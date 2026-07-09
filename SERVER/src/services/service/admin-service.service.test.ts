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
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  NotificationType,
  NotificationChannel,
} from "../../constants/notification";
import { ServiceCategory, CreateServiceInput } from "../../types/service/service.type";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { UpdateServiceInput } from "../../types/service/service.type";

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

describe("adminServiceService.updateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an attempt to change the code", async () => {
    await expect(
      adminServiceService.updateService(
        "svc1",
        { code: "OTHER" } as UpdateServiceInput & { code?: string },
        "admin1"
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(serviceRepository.updateById).not.toHaveBeenCalled();
  });

  it("updates allowed fields and stamps updated_by", async () => {
    (serviceRepository.updateById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      icon: "Music",
    });

    await adminServiceService.updateService(
      "svc1",
      { icon: "Music" },
      "admin1"
    );

    expect(serviceRepository.updateById).toHaveBeenCalledWith("svc1", {
      icon: "Music",
      updated_by: "admin1",
    });
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.updateById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.updateService("missing", { icon: "X" }, "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminServiceService.deprecateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deactivates, stamps deprecated_at, and notifies offering workers via in-app + email", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: true,
    });
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "CODE1",
      name: { vi: "Dịch vụ" },
      is_active: false,
    });
    (
      workerServiceRepository.findWorkerIdsByServiceId as jest.Mock
    ).mockResolvedValue(["w1", "w2"]);

    await adminServiceService.deprecateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).toHaveBeenCalledWith(
      "svc1",
      false,
      expect.any(Date),
      "admin1"
    );
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_ids: ["w1", "w2"],
        type: NotificationType.SERVICE_DEPRECATED,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        dedupe_key: "service_deprecated:svc1",
      })
    );
  });

  it("is idempotent when already deprecated (no write, no notify)", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: false,
    });

    await adminServiceService.deprecateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).not.toHaveBeenCalled();
    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.deprecateService("missing", "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminServiceService.reactivateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reactivates and clears deprecated_at", async () => {
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: true,
    });

    await adminServiceService.reactivateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).toHaveBeenCalledWith(
      "svc1",
      true,
      null,
      "admin1"
    );
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.reactivateService("missing", "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminServiceService.deleteService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.deleteService("missing")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks deletion with 409 when workers still reference it", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(3);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(0);

    await expect(
      adminServiceService.deleteService("svc1")
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "SERVICE_IN_USE",
      details: [
        { field: "worker_count", message: "3" },
        { field: "booking_count", message: "0" },
      ],
    });
    expect(serviceRepository.deleteById).not.toHaveBeenCalled();
  });

  it("blocks deletion with 409 when bookings still reference it", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(5);

    await expect(
      adminServiceService.deleteService("svc1")
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(serviceRepository.deleteById).not.toHaveBeenCalled();
  });

  it("deletes when there are zero references", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (serviceRepository.deleteById as jest.Mock).mockResolvedValue(true);

    await adminServiceService.deleteService("svc1");

    expect(serviceRepository.deleteById).toHaveBeenCalledWith("svc1");
  });
});
