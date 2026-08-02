import { BookingStatusService } from "./booking-status.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { BookingStatus, CancellationReason } from "../../constants/booking";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: { bookingCancelled: jest.fn() },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn(),
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getActiveValue: jest.fn() },
}));

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const service = new BookingStatusService();

const WORKER_ID = "6512aaaa0000000000000001";
const CLIENT_ID = "6512bbbb0000000000000002";
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const bookingAt = (startOffsetMs: number) =>
  ({
    _id: { toString: () => "booking1" },
    status: BookingStatus.CONFIRMED,
    client_id: { _id: { toString: () => CLIENT_ID } },
    worker_id: { _id: { toString: () => WORKER_ID } },
    schedule: { start_time: new Date(Date.now() + startOffsetMs) },
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  (
    require("../notification") as {
      notificationEventService: { bookingCancelled: jest.Mock };
    }
  ).notificationEventService.bookingCancelled.mockResolvedValue(undefined);
  (
    require("./booking-email") as { sendQuickBookingStatusEmail: jest.Mock }
  ).sendQuickBookingStatusEmail.mockResolvedValue(undefined);
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === ReputationConfigKey.CANCEL_MEDIUM_PENALTY) return 10;
    if (key === ReputationConfigKey.CANCEL_SEVERE_PENALTY) return 20;
    return null;
  });
});

it("applies the medium penalty between 30 minutes and 2 hours before start", async () => {
  const booking = bookingAt(HOUR); // 1 hour out
  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(booking);

  await service.cancelBooking(
    "booking1",
    WORKER_ID,
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isWorker: true, isClient: false, isAdmin: false }
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).toHaveBeenCalledWith(
    WORKER_ID,
    10,
    ReputationHistoryReason.WORKER_CANCEL_MEDIUM,
    0
  );
});

it("applies the severe penalty under 30 minutes before start", async () => {
  const booking = bookingAt(10 * MINUTE);
  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(booking);

  await service.cancelBooking(
    "booking1",
    WORKER_ID,
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isWorker: true, isClient: false, isAdmin: false }
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).toHaveBeenCalledWith(
    WORKER_ID,
    20,
    ReputationHistoryReason.WORKER_CANCEL_SEVERE,
    0
  );
});

it("applies no penalty when cancelling 2+ hours before start", async () => {
  const booking = bookingAt(3 * HOUR);
  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(booking);

  await service.cancelBooking(
    "booking1",
    WORKER_ID,
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isWorker: true, isClient: false, isAdmin: false }
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).not.toHaveBeenCalled();
});
