import { ReputationService } from "./reputation.service";
import { reputationConfigService } from "./reputation-config.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationHistoryRepository } from "../../repositories/reputation/reputation-history.repository";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("./reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn(), getActiveValue: jest.fn() },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { adjustReputationScore: jest.fn() },
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
