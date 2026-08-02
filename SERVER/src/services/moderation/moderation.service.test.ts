import { ModerationService } from "./moderation.service";
import { moderationRepository } from "../../repositories/moderation/moderation.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReportStatus, ReportTargetType } from "../../constants/moderation";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/moderation/moderation.repository");
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { getUserRoleInfoById: jest.fn() },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn(), recoverPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getActiveValue: jest.fn() },
}));

const repo = moderationRepository as jest.Mocked<typeof moderationRepository>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new ModerationService();

beforeEach(() => {
  jest.clearAllMocks();
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === ("report_filed_valid_bonus" as never)) return 10;
    if (key === ("reported_valid_penalty" as never)) return 10;
    return null;
  });
});

it("awards the reporter and penalizes the target when both are workers", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.OPEN,
    reporter_id: "reporter1",
    target_user_id: "target1",
    target_type: ReportTargetType.WORKER,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.WORKER,
  } as never);
  userRepo.getUserRoleInfoById.mockImplementation(async () => ({
    lastActiveRole: null,
    roles: ["worker"] as never,
    status: null,
    isWorker: true,
    isClient: false,
    isAdmin: false,
  }));

  await service.updateReportStatus({
    reportId: "r1",
    status: ReportStatus.RESOLVED,
    adminId: "admin1",
  });
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "reporter1",
    10,
    ReputationHistoryReason.REPORT_FILED_VALID,
    0
  );
  expect(repService.deductPoints).toHaveBeenCalledWith(
    "target1",
    10,
    ReputationHistoryReason.REPORTED_VALID,
    0
  );
});

it("only awards the reporter when the target is not a worker (independent effects)", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.OPEN,
    reporter_id: "reporter1",
    target_user_id: "target1",
    target_type: ReportTargetType.WORKER,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.WORKER,
  } as never);
  userRepo.getUserRoleInfoById.mockImplementation(async (id) => ({
    lastActiveRole: null,
    roles: id === "reporter1" ? (["worker"] as never) : (["client"] as never),
    status: null,
    isWorker: id === "reporter1",
    isClient: id !== "reporter1",
    isAdmin: false,
  }));

  await service.updateReportStatus({
    reportId: "r1",
    status: ReportStatus.RESOLVED,
    adminId: "admin1",
  });
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "reporter1",
    10,
    ReputationHistoryReason.REPORT_FILED_VALID,
    0
  );
  expect(repService.deductPoints).not.toHaveBeenCalled();
});

it("does not crash the target-penalty branch when the report has no target_user_id", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.OPEN,
    reporter_id: "reporter1",
    target_user_id: null,
    target_type: ReportTargetType.POST,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.POST,
  } as never);
  userRepo.getUserRoleInfoById.mockImplementation(async () => ({
    lastActiveRole: null,
    roles: ["worker"] as never,
    status: null,
    isWorker: true,
    isClient: false,
    isAdmin: false,
  }));

  await expect(
    service.updateReportStatus({
      reportId: "r1",
      status: ReportStatus.RESOLVED,
      adminId: "admin1",
    })
  ).resolves.toBeDefined();
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "reporter1",
    10,
    ReputationHistoryReason.REPORT_FILED_VALID,
    0
  );
  expect(repService.deductPoints).not.toHaveBeenCalled();
});

it("does not re-award when the report was already resolved", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.RESOLVED,
    reporter_id: "reporter1",
    target_user_id: "target1",
    target_type: ReportTargetType.WORKER,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.WORKER,
  } as never);

  await service.updateReportStatus({
    reportId: "r1",
    status: ReportStatus.RESOLVED,
    adminId: "admin1",
  });
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).not.toHaveBeenCalled();
  expect(repService.deductPoints).not.toHaveBeenCalled();
});
