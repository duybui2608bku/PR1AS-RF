import { WorkerReputationMigrationService } from "./worker-reputation-migration.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { gender, UserRole } from "../../types/auth/user.types";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findAllWorkersForMigration: jest.fn(),
    setReputationScoreAndComponent: jest.fn(),
  },
}));
jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: { countAndAverageForWorker: jest.fn() },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { countCompletedForWorker: jest.fn() },
}));
jest.mock("./reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn() },
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const reviewRepo = reviewRepository as jest.Mocked<typeof reviewRepository>;
const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const config = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new WorkerReputationMigrationService();

beforeEach(() => {
  jest.clearAllMocks();
  config.getValue.mockImplementation(async (key) => {
    const values: Record<string, number> = {
      profile_photos_bonus: 10,
      min_profile_photos_threshold: 5,
      profile_info_field_bonus: 5,
      review_received_bonus: 5,
      five_star_review_bonus: 5,
      job_completion_bonus: 5,
      low_review_threshold: 2,
    };
    return values[key as unknown as string];
  });
});

it("computes a clamped score from profile + reviews + completed jobs", async () => {
  userRepo.findAllWorkersForMigration.mockResolvedValue([
    {
      _id: { toString: () => "w1" },
      roles: [UserRole.WORKER],
      worker_profile: {
        gender: gender.OTHER,
        introduction: "hi",
        hobbies: [],
        gallery_urls: ["a", "b", "c", "d", "e"], // +10
      },
    } as never,
  ]);
  reviewRepo.countAndAverageForWorker.mockResolvedValue({
    total: 4,
    fiveStarCount: 2,
    lowRatingCount: 1,
  });
  bookingRepo.countCompletedForWorker.mockResolvedValue(3);

  const result = await service.runManual({ apply: true });

  // profile: 10 (photos) + 5 (introduction) = 15
  // reviews: 4*5 + 2*5 - 1*10 = 20 + 10 - 10 = 20
  // jobs: 3*5 = 15
  // total = 50, clamped [0,100]
  expect(userRepo.setReputationScoreAndComponent).toHaveBeenCalledWith(
    "w1",
    50,
    15
  );
  expect(result).toEqual({ scanned: 1, updated: 1 });
});

it("does not write when apply=false (dry run)", async () => {
  userRepo.findAllWorkersForMigration.mockResolvedValue([
    {
      _id: { toString: () => "w1" },
      roles: [UserRole.WORKER],
      worker_profile: null,
    } as never,
  ]);
  reviewRepo.countAndAverageForWorker.mockResolvedValue({
    total: 0,
    fiveStarCount: 0,
    lowRatingCount: 0,
  });
  bookingRepo.countCompletedForWorker.mockResolvedValue(0);

  const result = await service.runManual({ apply: false });

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(result).toEqual({ scanned: 1, updated: 0 });
});
