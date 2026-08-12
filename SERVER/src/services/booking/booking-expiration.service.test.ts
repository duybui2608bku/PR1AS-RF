import { BookingExpirationService } from "./booking-expiration.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BOOKING_LIMITS, BookingStatus } from "../../constants/booking";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findPendingBookingsForExpirationScan: jest.fn(),
    expirePendingBooking: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: {
    bookingAutoExpiredWarning: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: {
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
const service = new BookingExpirationService();

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

beforeEach(() => jest.clearAllMocks());

describe("getConfirmationDeadline", () => {
  it("uses the 6h-before-start deadline when the booking was made well in advance", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const startTime = new Date("2026-01-02T00:00:00Z"); // 24h after creation

    const result = service.getConfirmationDeadline({
      created_at: createdAt,
      schedule: { start_time: startTime },
    } as never);

    expect(result.reason).toBe("confirmation_deadline_before_start");
    expect(result.deadline.getTime()).toBe(
      startTime.getTime() -
        BOOKING_LIMITS.CONFIRM_DEADLINE_BEFORE_START_HOURS * HOUR_MS
    );
  });

  it("falls back to a short-notice window when the booking starts within the before-start deadline", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    // Starts only 1h after creation, well inside the 6h window.
    const startTime = new Date("2026-01-01T01:00:00Z");

    const result = service.getConfirmationDeadline({
      created_at: createdAt,
      schedule: { start_time: startTime },
    } as never);

    expect(result.reason).toBe("short_notice_confirmation_timeout");
    expect(result.deadline.getTime()).toBe(
      createdAt.getTime() +
        BOOKING_LIMITS.SHORT_NOTICE_CONFIRM_MINUTES * MINUTE_MS
    );
  });

  it("treats the exact boundary (beforeStartDeadline === createdAt) as short-notice", () => {
    // beforeStartDeadline <= createdAt uses <=, so an exact tie must take
    // the short-notice branch, not the before-start branch.
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const startTime = new Date(
      createdAt.getTime() +
        BOOKING_LIMITS.CONFIRM_DEADLINE_BEFORE_START_HOURS * HOUR_MS
    );

    const result = service.getConfirmationDeadline({
      created_at: createdAt,
      schedule: { start_time: startTime },
    } as never);

    expect(result.reason).toBe("short_notice_confirmation_timeout");
  });
});

describe("expireUnconfirmedBookings", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  const pendingBooking = (
    id: string,
    overrides: { status?: BookingStatus; createdAt?: Date; startTime?: Date } = {}
  ) =>
    ({
      _id: { toString: () => id },
      status: overrides.status ?? BookingStatus.PENDING,
      created_at: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
      schedule: {
        start_time: overrides.startTime ?? new Date("2026-01-02T00:00:00Z"),
      },
    }) as never;

  const expiredBooking = (id: string, workerId: string) =>
    ({
      _id: { toString: () => id },
      worker_id: { toString: () => workerId },
    }) as never;

  it("skips candidates whose status changed since the scan query ran", async () => {
    repo.findPendingBookingsForExpirationScan.mockResolvedValue([
      pendingBooking("a", { status: BookingStatus.CONFIRMED }),
    ]);

    const result = await service.expireUnconfirmedBookings(now);

    expect(repo.expirePendingBooking).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned_count: 1, expired_count: 0 });
  });

  it("skips candidates whose deadline has not passed yet", async () => {
    repo.findPendingBookingsForExpirationScan.mockResolvedValue([
      pendingBooking("a", {
        createdAt: now,
        startTime: new Date(now.getTime() + 24 * HOUR_MS),
      }),
    ]);

    const result = await service.expireUnconfirmedBookings(now);

    expect(repo.expirePendingBooking).not.toHaveBeenCalled();
    expect(result.expired_count).toBe(0);
  });

  it("expires an eligible candidate and deducts the configured reputation penalty from the worker", async () => {
    repo.findPendingBookingsForExpirationScan.mockResolvedValue([
      pendingBooking("a", {
        createdAt: new Date(now.getTime() - 48 * HOUR_MS),
        startTime: new Date(now.getTime() - 24 * HOUR_MS),
      }),
    ]);
    repo.expirePendingBooking.mockResolvedValue(expiredBooking("a", "worker1"));
    reputationConfig.getActiveValue.mockResolvedValue(10);

    const result = await service.expireUnconfirmedBookings(now);
    // Flush the fire-and-forget .then() chain that triggers the deduction.
    await Promise.resolve();
    await Promise.resolve();

    expect(repo.expirePendingBooking).toHaveBeenCalledWith("a");
    expect(result).toEqual({ scanned_count: 1, expired_count: 1 });
    expect(reputation.deductPoints).toHaveBeenCalledWith(
      "worker1",
      10,
      ReputationHistoryReason.BOOKING_EXPIRY,
      0
    );
  });

  it("does not deduct reputation when the BOOKING_EXPIRY_DEDUCTION rule is disabled", async () => {
    repo.findPendingBookingsForExpirationScan.mockResolvedValue([
      pendingBooking("a", {
        createdAt: new Date(now.getTime() - 48 * HOUR_MS),
        startTime: new Date(now.getTime() - 24 * HOUR_MS),
      }),
    ]);
    repo.expirePendingBooking.mockResolvedValue(expiredBooking("a", "worker1"));
    reputationConfig.getActiveValue.mockResolvedValue(null);

    await service.expireUnconfirmedBookings(now);
    await Promise.resolve();
    await Promise.resolve();

    expect(reputation.deductPoints).not.toHaveBeenCalled();
  });

  it("does not count or penalize when another process already expired the booking (race)", async () => {
    repo.findPendingBookingsForExpirationScan.mockResolvedValue([
      pendingBooking("a", {
        createdAt: new Date(now.getTime() - 48 * HOUR_MS),
        startTime: new Date(now.getTime() - 24 * HOUR_MS),
      }),
    ]);
    repo.expirePendingBooking.mockResolvedValue(null);

    const result = await service.expireUnconfirmedBookings(now);
    await Promise.resolve();
    await Promise.resolve();

    expect(result.expired_count).toBe(0);
    expect(reputation.deductPoints).not.toHaveBeenCalled();
  });
});
