import { UserService } from "./user.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationService } from "../reputation/reputation.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { UserRole, UserStatus } from "../../types/auth/user.types";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
    emailExists: jest.fn(),
    updateByAdmin: jest.fn(),
    setReputationScoreAndComponent: jest.fn(),
  },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: {
    syncWorkerProfileCompleteness: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    deleteAllForWorker: jest.fn().mockResolvedValue(undefined),
    upsertManyForWorker: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../repositories/boost/worker-point-wallet.repository", () => ({
  workerPointWalletRepository: { findOrCreate: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../utils/userStatusCache", () => ({
  invalidateUserStatusCache: jest.fn(),
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const workerServiceRepo = workerServiceRepository as jest.Mocked<
  typeof workerServiceRepository
>;
const workerPointWalletRepo = workerPointWalletRepository as jest.Mocked<
  typeof workerPointWalletRepository
>;

const service = new UserService();

const baseInput = {
  full_name: "Test User",
  roles: [UserRole.CLIENT, UserRole.WORKER] as UserRole[],
  status: UserStatus.ACTIVE,
  worker_profile: { gender: "OTHER" },
  worker_services: [],
};

beforeEach(() => jest.clearAllMocks());

it("resets reputation to 0 when promoting a client to worker for the first time", async () => {
  userRepo.findById
    .mockResolvedValueOnce({
      created_by_admin: true,
      roles: [UserRole.CLIENT],
      email: "a@test.com",
    } as never) // existing, fetched first
    .mockResolvedValueOnce({
      _id: { toString: () => "u1" },
      roles: [UserRole.CLIENT, UserRole.WORKER],
      worker_profile: { gender: "OTHER" },
      meta_data: { reputation_score: 0, reputation_profile_component: 0 },
    } as never); // re-fetched after reset, before sync
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT, UserRole.WORKER],
  } as never);

  await service.updateUserByAdmin("u1", baseInput as never);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).toHaveBeenCalledWith("u1", 0, 0);
  expect(repService.syncWorkerProfileCompleteness).toHaveBeenCalled();
});

it("does not reset reputation when the user was already a worker", async () => {
  userRepo.findById
    .mockResolvedValueOnce({
      created_by_admin: true,
      roles: [UserRole.CLIENT, UserRole.WORKER],
      email: "a@test.com",
    } as never)
    .mockResolvedValueOnce({
      _id: { toString: () => "u1" },
      roles: [UserRole.CLIENT, UserRole.WORKER],
      worker_profile: { gender: "OTHER" },
      meta_data: { reputation_score: 55, reputation_profile_component: 20 },
    } as never);
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT, UserRole.WORKER],
  } as never);

  await service.updateUserByAdmin("u1", baseInput as never);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(repService.syncWorkerProfileCompleteness).toHaveBeenCalled();
});

it("does not touch reputation at all when the edited user is not a worker", async () => {
  userRepo.findById.mockResolvedValueOnce({
    created_by_admin: true,
    roles: [UserRole.CLIENT],
    email: "a@test.com",
  } as never);
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT],
  } as never);

  await service.updateUserByAdmin("u1", {
    ...baseInput,
    roles: [UserRole.CLIENT],
  } as never);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(repService.syncWorkerProfileCompleteness).not.toHaveBeenCalled();
  expect(workerServiceRepo.upsertManyForWorker).not.toHaveBeenCalled();
  expect(workerPointWalletRepo.findOrCreate).not.toHaveBeenCalled();
});

it("resets reputation to 100 when demoting an existing worker back to client-only", async () => {
  userRepo.findById.mockResolvedValueOnce({
    created_by_admin: true,
    roles: [UserRole.CLIENT, UserRole.WORKER],
    email: "a@test.com",
  } as never);
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT],
  } as never);

  await service.updateUserByAdmin("u1", {
    ...baseInput,
    roles: [UserRole.CLIENT],
  } as never);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).toHaveBeenCalledWith(
    "u1",
    100,
    0
  );
  expect(repService.syncWorkerProfileCompleteness).not.toHaveBeenCalled();
  expect(workerServiceRepo.upsertManyForWorker).not.toHaveBeenCalled();
  expect(workerPointWalletRepo.findOrCreate).not.toHaveBeenCalled();
});
