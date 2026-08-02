import { BookingAutoCompleteService } from "./booking-auto-complete.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BOOKING_LIMITS, BookingStatus } from "../../constants/booking";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findFinishedBookingsForAutoComplete: jest.fn(),
    autoCompleteBooking: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: {
    bookingStatusUpdated: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: {
    awardJobCompletion: jest.fn().mockResolvedValue(undefined),
    deductPoints: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getActiveValue: jest.fn() },
}));

const repo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const reputation = reputationService as jest.Mocked<typeof reputationService>;
const reputationConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const service = new BookingAutoCompleteService();
const now = new Date("2026-01-01T18:00:00Z");
const booking = (id: string) => ({ _id: { toString: () => id } }) as never;
const candidate = (id: string, status: BookingStatus) =>
  ({ _id: { toString: () => id }, status }) as never;
const completedBooking = (id: string, workerId: string) =>
  ({
    _id: { toString: () => id },
    worker_id: { _id: { toString: () => workerId } },
    status: BookingStatus.COMPLETED,
  }) as never;

beforeEach(() => jest.clearAllMocks());

it("gives started bookings a short grace and CONFIRMED ones the full dispute window", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([]);

  await service.completeFinishedBookings(now);

  const [startedCutoff, unstartedCutoff] =
    repo.findFinishedBookingsForAutoComplete.mock.calls[0];
  expect(now.getTime() - startedCutoff.getTime()).toBe(
    BOOKING_LIMITS.AUTO_COMPLETE_HOURS * 60 * 60 * 1000
  );
  expect(now.getTime() - unstartedCutoff.getTime()).toBe(
    BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS * 24 * 60 * 60 * 1000
  );
  // CONFIRMED bị auto-complete đúng lúc cửa sổ khiếu nại tính-từ-end_time đóng lại,
  // nên dispute deadline buộc phải neo theo completed_at mới còn ý nghĩa.
  expect(BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS).toBe(
    BOOKING_LIMITS.DISPUTE_WINDOW_DAYS
  );
});

it("counts only bookings the atomic update actually flipped to COMPLETED", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([
    booking("a"),
    booking("b"),
  ]);
  // "b" đã bị client bấm dispute ngay trước job → guard status trong query trả null
  repo.autoCompleteBooking
    .mockResolvedValueOnce({ status: BookingStatus.COMPLETED } as never)
    .mockResolvedValueOnce(null);

  const result = await service.completeFinishedBookings(now);

  expect(result).toEqual({ scanned_count: 2, completed_count: 1 });
});

it("awards the job-completion bonus for every auto-completed booking", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([
    candidate("a", BookingStatus.IN_PROGRESS),
    candidate("b", BookingStatus.CONFIRMED),
  ]);
  repo.autoCompleteBooking
    .mockResolvedValueOnce(completedBooking("a", "worker-started"))
    .mockResolvedValueOnce(completedBooking("b", "worker-unstarted"));
  reputationConfig.getActiveValue.mockResolvedValue(3);

  await service.completeFinishedBookings(now);

  expect(reputation.awardJobCompletion).toHaveBeenCalledWith(
    "worker-started"
  );
  expect(reputation.awardJobCompletion).toHaveBeenCalledWith(
    "worker-unstarted"
  );
  expect(reputation.awardJobCompletion).toHaveBeenCalledTimes(2);
});

it("penalizes late completion only for bookings that had actually started", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([
    candidate("a", BookingStatus.IN_PROGRESS),
    candidate("b", BookingStatus.PENDING_CLIENT_ACCEPTANCE),
    candidate("c", BookingStatus.CONFIRMED),
  ]);
  repo.autoCompleteBooking
    .mockResolvedValueOnce(completedBooking("a", "worker-started"))
    .mockResolvedValueOnce(completedBooking("b", "worker-pending-acceptance"))
    .mockResolvedValueOnce(completedBooking("c", "worker-unstarted"));
  reputationConfig.getActiveValue.mockResolvedValue(3);

  await service.completeFinishedBookings(now);
  // Flush the pending .then() chains queued by the deductPoints calls.
  await Promise.resolve();
  await Promise.resolve();

  expect(reputation.deductPoints).toHaveBeenCalledWith(
    "worker-started",
    3,
    ReputationHistoryReason.LATE_COMPLETION,
    0
  );
  expect(reputation.deductPoints).toHaveBeenCalledWith(
    "worker-pending-acceptance",
    3,
    ReputationHistoryReason.LATE_COMPLETION,
    0
  );
  expect(reputation.deductPoints).not.toHaveBeenCalledWith(
    "worker-unstarted",
    expect.anything(),
    expect.anything(),
    expect.anything()
  );
  expect(reputation.deductPoints).toHaveBeenCalledTimes(2);
});
