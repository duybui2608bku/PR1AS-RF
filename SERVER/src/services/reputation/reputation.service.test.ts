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

const service = new ReputationService();

beforeEach(() => jest.clearAllMocks());

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
