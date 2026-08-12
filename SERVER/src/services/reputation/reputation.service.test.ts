import { ReputationService } from "./reputation.service";
import { reputationConfigService } from "./reputation-config.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationHistoryRepository } from "../../repositories/reputation/reputation-history.repository";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { UserRole, IUserDocument } from "../../types/auth/user.types";

jest.mock("./reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn(), getActiveValue: jest.fn() },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    adjustReputationScore: jest.fn(),
    setReputationProfileComponent: jest.fn(),
    findReputationRecoveryCandidates: jest.fn(),
  },
}));
jest.mock("../../repositories/reputation/reputation-history.repository", () => ({
  reputationHistoryRepository: { create: jest.fn() },
}));
jest.mock("../notification", () => ({
  notificationEventService: { reputationWarning: jest.fn() },
}));

const config = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const historyRepo = reputationHistoryRepository as jest.Mocked<
  typeof reputationHistoryRepository
>;
const notificationEventService = jest.requireMock(
  "../notification"
).notificationEventService as { reputationWarning: jest.Mock };

const service = new ReputationService();

beforeEach(() => {
  jest.clearAllMocks();
  notificationEventService.reputationWarning.mockResolvedValue(undefined);
});

describe("deductPoints", () => {
  it("subtracts points, writes history with the actual delta, and does not notify above threshold", async () => {
    config.getValue.mockResolvedValue(30);
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 80,
      newScore: 70,
    });

    await service.deductPoints("u1", 10, ReputationHistoryReason.MANUAL, 100);

    expect(userRepo.adjustReputationScore).toHaveBeenCalledWith(
      "u1",
      -10,
      100
    );
    expect(historyRepo.create).toHaveBeenCalledWith({
      userId: "u1",
      delta: -10,
      previousScore: 80,
      newScore: 70,
      reason: ReputationHistoryReason.MANUAL,
    });
    expect(notificationEventService.reputationWarning).not.toHaveBeenCalled();
  });

  it("notifies when the deduction crosses the warning threshold from at-or-above to below", async () => {
    config.getValue.mockResolvedValue(30);
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 30,
      newScore: 20,
    });

    await service.deductPoints("u1", 10);

    expect(notificationEventService.reputationWarning).toHaveBeenCalledWith(
      "u1",
      20
    );
  });

  it("notifies again on a further deduction while already below threshold", async () => {
    config.getValue.mockResolvedValue(30);
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 20,
      newScore: 10,
    });

    await service.deductPoints("u1", 10);

    expect(notificationEventService.reputationWarning).toHaveBeenCalledWith(
      "u1",
      10
    );
  });

  it("does not notify when already below threshold but the score does not actually decrease (clamped at 0)", async () => {
    config.getValue.mockResolvedValue(30);
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 0,
      newScore: 0,
    });

    await service.deductPoints("u1", 10);

    expect(notificationEventService.reputationWarning).not.toHaveBeenCalled();
  });

  it("does not write history or notify when the user no longer exists", async () => {
    userRepo.adjustReputationScore.mockResolvedValue(null);

    await service.deductPoints("missing", 10);

    expect(historyRepo.create).not.toHaveBeenCalled();
    expect(notificationEventService.reputationWarning).not.toHaveBeenCalled();
    expect(config.getValue).not.toHaveBeenCalled();
  });
});

describe("recoverPoints", () => {
  it("adds points, writes history with a positive delta, and never sends a warning notification", async () => {
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 10,
      newScore: 20,
    });

    await service.recoverPoints(
      "u1",
      10,
      ReputationHistoryReason.DAILY_RECOVERY,
      0
    );

    expect(userRepo.adjustReputationScore).toHaveBeenCalledWith("u1", 10, 0);
    expect(historyRepo.create).toHaveBeenCalledWith({
      userId: "u1",
      delta: 10,
      previousScore: 10,
      newScore: 20,
      reason: ReputationHistoryReason.DAILY_RECOVERY,
    });
    expect(notificationEventService.reputationWarning).not.toHaveBeenCalled();
  });

  it("does not write history when the user no longer exists", async () => {
    userRepo.adjustReputationScore.mockResolvedValue(null);

    await service.recoverPoints("missing", 10);

    expect(historyRepo.create).not.toHaveBeenCalled();
  });
});

describe("bulkDailyRecovery", () => {
  it("skips entirely and does not query candidates when the rule is disabled", async () => {
    config.getActiveValue.mockResolvedValue(null);

    const count = await service.bulkDailyRecovery();

    expect(count).toBe(0);
    expect(userRepo.findReputationRecoveryCandidates).not.toHaveBeenCalled();
  });

  it("recovers each eligible candidate and returns the count of users actually changed", async () => {
    config.getActiveValue.mockResolvedValue(5);
    userRepo.findReputationRecoveryCandidates.mockResolvedValue([
      { _id: { toString: () => "u1" } } as never,
      { _id: { toString: () => "u2" } } as never,
    ]);
    userRepo.adjustReputationScore
      .mockResolvedValueOnce({ previousScore: 90, newScore: 95 })
      // u2 is already at the ceiling: adjustReputationScore clamps to 100,
      // so previousScore === newScore even though it "ran".
      .mockResolvedValueOnce({ previousScore: 100, newScore: 100 });

    const count = await service.bulkDailyRecovery();

    expect(count).toBe(1);
    expect(historyRepo.create).toHaveBeenCalledTimes(1);
    expect(historyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", delta: 5 })
    );
  });

  it("skips a candidate the repository no longer finds without throwing", async () => {
    config.getActiveValue.mockResolvedValue(5);
    userRepo.findReputationRecoveryCandidates.mockResolvedValue([
      { _id: { toString: () => "u1" } } as never,
    ]);
    userRepo.adjustReputationScore.mockResolvedValue(null);

    const count = await service.bulkDailyRecovery();

    expect(count).toBe(0);
    expect(historyRepo.create).not.toHaveBeenCalled();
  });
});

it("awards the configured job-completion bonus with defaultScore 0", async () => {
  config.getActiveValue.mockResolvedValue(5);
  userRepo.adjustReputationScore.mockResolvedValue({
    previousScore: 10,
    newScore: 15,
  });

  await service.awardJobCompletion("worker1");

  expect(userRepo.adjustReputationScore).toHaveBeenCalledWith(
    "worker1",
    5,
    0
  );
  expect(historyRepo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "worker1",
      reason: ReputationHistoryReason.JOB_COMPLETED,
    })
  );
});

it("skips when the bonus is disabled", async () => {
  config.getActiveValue.mockResolvedValue(null);

  await service.awardJobCompletion("worker1");

  expect(userRepo.adjustReputationScore).not.toHaveBeenCalled();
});

describe("syncWorkerProfileCompleteness", () => {
  const buildWorker = (): IUserDocument =>
    ({
      _id: { toString: () => "worker1" },
      roles: [UserRole.WORKER],
      worker_profile: {
        gallery_urls: ["a.jpg", "b.jpg", "c.jpg"],
        introduction: "hi",
        date_of_birth: "2000-01-01",
        height_cm: 160,
        weight_kg: 50,
        star_sign: null,
        occupation: null,
        lifestyle: null,
        hobbies: null,
        personality: null,
        marital_status: null,
      },
      meta_data: { reputation_profile_component: 0 },
    }) as never;

  const configByKey = (values: {
    getValue?: Partial<Record<ReputationConfigKey, number>>;
    getActiveValue?: Partial<Record<ReputationConfigKey, number | null>>;
  }) => {
    config.getValue.mockImplementation((key: ReputationConfigKey) =>
      Promise.resolve(values.getValue?.[key] as number)
    );
    config.getActiveValue.mockImplementation((key: ReputationConfigKey) =>
      Promise.resolve(values.getActiveValue?.[key] ?? null)
    );
  };

  it("uses getActiveValue for both toggleable bonuses and getValue for the threshold when all rules are active", async () => {
    configByKey({
      getValue: {
        [ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD]: 3,
      },
      getActiveValue: {
        [ReputationConfigKey.PROFILE_PHOTOS_BONUS]: 10,
        [ReputationConfigKey.PROFILE_INFO_FIELD_BONUS]: 2,
      },
    });
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 50,
      newScore: 68,
    });

    await service.syncWorkerProfileCompleteness(buildWorker());

    // photo bonus (10, enough photos) + 4 filled fields * 2 = 18
    expect(userRepo.adjustReputationScore).toHaveBeenCalledWith(
      "worker1",
      18,
      0
    );
    expect(config.getActiveValue).toHaveBeenCalledWith(
      ReputationConfigKey.PROFILE_PHOTOS_BONUS
    );
    expect(config.getActiveValue).toHaveBeenCalledWith(
      ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
    );
    expect(config.getValue).toHaveBeenCalledWith(
      ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
    );
    expect(userRepo.setReputationProfileComponent).toHaveBeenCalledWith(
      "worker1",
      18
    );
  });

  it("treats a toggled-off PROFILE_PHOTOS_BONUS as a 0 contribution, while the still-active info-field bonus keeps applying", async () => {
    configByKey({
      getValue: {
        [ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD]: 3,
        // If the buggy getValue path were still used for the toggleable
        // bonus, it would return this non-zero value even though the rule
        // is disabled — that's exactly the bug this test guards against.
        [ReputationConfigKey.PROFILE_PHOTOS_BONUS]: 10,
      },
      getActiveValue: {
        [ReputationConfigKey.PROFILE_PHOTOS_BONUS]: null,
        [ReputationConfigKey.PROFILE_INFO_FIELD_BONUS]: 2,
      },
    });
    userRepo.adjustReputationScore.mockResolvedValue({
      previousScore: 50,
      newScore: 58,
    });

    await service.syncWorkerProfileCompleteness(buildWorker());

    // photo bonus disabled -> 0 contribution; 4 filled fields * 2 = 8
    expect(userRepo.adjustReputationScore).toHaveBeenCalledWith(
      "worker1",
      8,
      0
    );
    expect(userRepo.setReputationProfileComponent).toHaveBeenCalledWith(
      "worker1",
      8
    );
  });
});
