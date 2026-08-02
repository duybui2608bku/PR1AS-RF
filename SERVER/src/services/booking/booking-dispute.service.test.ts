import { BookingDisputeService } from "./booking-dispute.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import {
  BookingStatus,
  DisputeReason,
  DisputeResolution,
} from "../../constants/booking";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: {
    disputeResolved: jest.fn().mockResolvedValue(undefined),
  },
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

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const reputation = reputationService as jest.Mocked<typeof reputationService>;
const reputationConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const service = new BookingDisputeService();

const WORKER_ID = "6512aaaa0000000000000001";
const CLIENT_ID = "6512bbbb0000000000000002";
const ADMIN_ID = "6512cccc0000000000000003";

const disputedBooking = (reason: DisputeReason) =>
  ({
    _id: { toString: () => "booking1" },
    worker_id: { _id: { toString: () => WORKER_ID } },
    client_id: { _id: { toString: () => CLIENT_ID } },
    status: BookingStatus.DISPUTED,
    dispute: {
      reason,
      description: "test dispute",
      evidence_urls: [],
      disputed_by: CLIENT_ID,
      disputed_at: new Date(),
      resolution: null,
      resolution_notes: "",
      resolved_by: null,
      resolved_at: null,
    },
    schedule: {
      start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end_time: new Date(Date.now() - 20 * 60 * 60 * 1000),
      duration_hours: 4,
    },
  }) as never;

const resolvedBooking = (reason: DisputeReason) =>
  ({
    _id: { toString: () => "booking1" },
    worker_id: { _id: { toString: () => WORKER_ID } },
    client_id: { _id: { toString: () => CLIENT_ID } },
    status: BookingStatus.CANCELLED,
    dispute: {
      reason,
      description: "test dispute",
      evidence_urls: [],
      disputed_by: CLIENT_ID,
      disputed_at: new Date(),
      resolution: DisputeResolution.FAVOR_CLIENT,
      resolution_notes: "Admin decision",
      resolved_by: ADMIN_ID,
      resolved_at: new Date(),
    },
    cancellation: {
      cancelled_at: new Date(),
      cancelled_by: "admin" as const,
      reason: "policy_violation" as const,
      notes: "Admin decision",
    },
    schedule: {
      start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end_time: new Date(Date.now() - 20 * 60 * 60 * 1000),
      duration_hours: 4,
    },
  }) as never;

beforeEach(() => jest.clearAllMocks());

it("deducts the no-show penalty when a WORKER_NO_SHOW dispute resolves FAVOR_CLIENT", async () => {
  const booking = disputedBooking(DisputeReason.WORKER_NO_SHOW);
  const resolved = resolvedBooking(DisputeReason.WORKER_NO_SHOW);

  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(resolved);
  reputationConfig.getActiveValue.mockResolvedValue(30);

  await service.resolveDispute(
    "booking1",
    ADMIN_ID,
    DisputeResolution.FAVOR_CLIENT,
    "confirmed no-show",
    { isAdmin: true } as never
  );

  // Flush the pending .then() chains queued by the deductPoints call.
  await Promise.resolve();

  expect(reputationConfig.getActiveValue).toHaveBeenCalledWith(
    "cancel_noshow_penalty"
  );
  expect(reputation.deductPoints).toHaveBeenCalledWith(
    WORKER_ID,
    30,
    ReputationHistoryReason.WORKER_NO_SHOW,
    0
  );
  expect(reputation.awardJobCompletion).not.toHaveBeenCalled();
});

it("does not deduct the no-show penalty for other dispute reasons", async () => {
  const booking = disputedBooking(DisputeReason.POOR_QUALITY);
  const resolved = resolvedBooking(DisputeReason.POOR_QUALITY);

  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(resolved);

  await service.resolveDispute(
    "booking1",
    ADMIN_ID,
    DisputeResolution.FAVOR_CLIENT,
    "refunded",
    { isAdmin: true } as never
  );

  expect(reputation.deductPoints).not.toHaveBeenCalled();
  expect(reputation.awardJobCompletion).not.toHaveBeenCalled();
});
