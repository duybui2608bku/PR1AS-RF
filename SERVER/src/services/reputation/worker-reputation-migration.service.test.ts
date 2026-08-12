import { WorkerReputationMigrationService } from "./worker-reputation-migration.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { Migration } from "../../models/migration";
import { withJobLock } from "../../utils/job-lock";
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
jest.mock("../../models/migration", () => ({
  Migration: { exists: jest.fn(), create: jest.fn() },
}));
jest.mock("../../utils/job-lock", () => ({
  withJobLock: jest.fn(),
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const reviewRepo = reviewRepository as jest.Mocked<typeof reviewRepository>;
const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const config = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const MigrationMock = Migration as unknown as {
  exists: jest.Mock;
  create: jest.Mock;
};
const withJobLockMock = withJobLock as jest.Mock;

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
      low_review_deduction: 10,
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
  // reviews: 4*5 + 2*5 - 1*lowReviewDeduction(10) = 20 + 10 - 10 = 20
  //   (lowReviewDeduction is now sourced live from reputationConfigService,
  //   mocked to 10 here — same numeric result as the previous hardcoded 10)
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

describe("runOnBoot", () => {
  it("skips entirely when the migration marker already exists", async () => {
    MigrationMock.exists.mockResolvedValue({ _id: "m1" });

    await service.runOnBoot();

    expect(withJobLockMock).not.toHaveBeenCalled();
    expect(userRepo.findAllWorkersForMigration).not.toHaveBeenCalled();
  });

  it("runs the migration and records the marker when not yet applied", async () => {
    MigrationMock.exists.mockResolvedValue(null);
    withJobLockMock.mockImplementation(
      async (_name: string, _opts: unknown, fn: () => Promise<unknown>) =>
        fn()
    );
    const runManualSpy = jest
      .spyOn(service, "runManual")
      .mockResolvedValue({ scanned: 0, updated: 0 });

    await service.runOnBoot();

    expect(withJobLockMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ ttlMs: expect.any(Number) }),
      expect.any(Function)
    );
    expect(runManualSpy).toHaveBeenCalledWith({ apply: true });
    expect(MigrationMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    );
  });

  it("does not run or record when the lock is held by another instance", async () => {
    MigrationMock.exists.mockResolvedValue(null);
    // Simulates withJobLock's real behavior when it loses the race: it
    // resolves null without ever invoking the callback.
    withJobLockMock.mockResolvedValue(null);
    const runManualSpy = jest.spyOn(service, "runManual");

    await service.runOnBoot();

    expect(runManualSpy).not.toHaveBeenCalled();
    expect(MigrationMock.create).not.toHaveBeenCalled();
  });

  it("re-checks the marker inside the lock, in case another instance finished first", async () => {
    // First check (outside the lock): not yet applied.
    // Second check (inside the lock, after acquiring it): another instance
    // finished the migration while we were waiting for the lock.
    MigrationMock.exists
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "m1" });
    withJobLockMock.mockImplementation(
      async (_name: string, _opts: unknown, fn: () => Promise<unknown>) =>
        fn()
    );
    const runManualSpy = jest.spyOn(service, "runManual");

    await service.runOnBoot();

    expect(runManualSpy).not.toHaveBeenCalled();
    expect(MigrationMock.create).not.toHaveBeenCalled();
  });
});
