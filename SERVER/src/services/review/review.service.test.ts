import { ReviewService } from "./review.service";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { BookingStatus } from "../../constants/booking";
import { ReviewType } from "../../constants/review";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: {
    findByBookingId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { findById: jest.fn() },
}));
jest.mock("../notification", () => ({
  notificationEventService: {
    reviewCreated: jest.fn().mockResolvedValue(undefined),
    reviewUpdated: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn(), recoverPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn(), getActiveValue: jest.fn() },
}));

// Real ObjectId-shaped hex strings: reviewService.createReview passes
// client_id/worker_id through `new Types.ObjectId(...)`, which throws on
// non-hex placeholder strings like "client1"/"worker1".
const CLIENT_ID = "507f191e810c19729de860ea";
const WORKER_ID = "507f191e810c19729de860eb";

const booking = {
  _id: "b1",
  status: BookingStatus.COMPLETED,
  client_id: CLIENT_ID,
  worker_id: WORKER_ID,
};

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const reviewRepo = reviewRepository as jest.Mocked<typeof reviewRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new ReviewService();

beforeEach(() => {
  jest.clearAllMocks();
  bookingRepo.findById.mockResolvedValue(booking as never);
  reviewRepo.findByBookingId.mockResolvedValue(null);
  reviewRepo.create.mockImplementation(async (data) => data as never);
  repConfig.getValue.mockResolvedValue(2); // LOW_REVIEW_THRESHOLD
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === ("review_received_bonus" as never)) return 5;
    if (key === ("five_star_review_bonus" as never)) return 5;
    if (key === ("low_review_deduction" as never)) return 10;
    return null;
  });
});

const input = {
  booking_id: "b1",
  worker_id: WORKER_ID,
  client_id: CLIENT_ID,
  review_type: ReviewType.CLIENT_TO_WORKER,
  rating: 5,
  rating_details: {
    professionalism: 5,
    punctuality: 5,
    communication: 5,
    service_quality: 5,
  },
  comment: "Great service, would book again",
} as never;

it("awards review-received and five-star bonuses for a 5-star review", async () => {
  await service.createReview(input, CLIENT_ID);
  await new Promise((r) => setTimeout(r, 0)); // flush fire-and-forget promises

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    WORKER_ID,
    5,
    ReputationHistoryReason.REVIEW_RECEIVED,
    0
  );
  expect(repService.recoverPoints).toHaveBeenCalledWith(
    WORKER_ID,
    5,
    ReputationHistoryReason.FIVE_STAR_REVIEW,
    0
  );
  expect(repService.deductPoints).not.toHaveBeenCalled();
});

it("deducts for a low review and does not award the five-star bonus", async () => {
  await service.createReview(
    { ...(input as object), rating: 1 } as never,
    CLIENT_ID
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    WORKER_ID,
    5,
    ReputationHistoryReason.REVIEW_RECEIVED,
    0
  );
  expect(repService.recoverPoints).not.toHaveBeenCalledWith(
    WORKER_ID,
    5,
    ReputationHistoryReason.FIVE_STAR_REVIEW,
    0
  );
  expect(repService.deductPoints).toHaveBeenCalledWith(
    WORKER_ID,
    10,
    ReputationHistoryReason.LOW_REVIEW,
    0
  );
});

it("rejects updateReview from the owning client (client can no longer edit)", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
    status: undefined,
  } as never);
  // Configure update to succeed so the test only passes if authorization
  // itself blocks the call, not because the mock happens to return falsy.
  reviewRepo.update.mockResolvedValue({ _id: "r1", rating: 4 } as never);

  await expect(
    service.updateReview("r1", { rating: 4 }, "client1", ["client"])
  ).rejects.toThrow();
});

it("still allows updateReview from an admin", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);
  reviewRepo.update.mockResolvedValue({ _id: "r1", rating: 4 } as never);

  await expect(
    service.updateReview("r1", { rating: 4 }, "admin1", ["admin"])
  ).resolves.toBeDefined();
});

it("rejects deleteReview from the owning client (client can no longer delete)", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);
  // Configure delete to succeed so the test only passes if authorization
  // itself blocks the call, not because the mock happens to return falsy.
  reviewRepo.delete.mockResolvedValue(true as never);

  await expect(
    service.deleteReview("r1", "client1", ["client"])
  ).rejects.toThrow();
});

it("still allows deleteReview from an admin", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);
  reviewRepo.delete.mockResolvedValue(true as never);

  await expect(
    service.deleteReview("r1", "admin1", ["admin"])
  ).resolves.toBeUndefined();
});
