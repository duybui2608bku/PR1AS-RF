import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";
import { UserRole, UserStatus, gender } from "../../types/auth/user.types";

jest.mock("../../models/auth/user.model", () => {
  const MockUser = jest.fn().mockImplementation(function (
    this: Record<string, unknown>,
    data: Record<string, unknown>
  ) {
    Object.assign(this, data);
    this.save = jest.fn().mockImplementation(async () => this);
  });
  return {
    User: Object.assign(MockUser, { findByIdAndUpdate: jest.fn() }),
  };
});

const UserMock = User as unknown as jest.Mock & {
  findByIdAndUpdate: jest.Mock;
};

beforeEach(() => jest.clearAllMocks());

it("resets reputation_score and profile component to 0 when addWorkerRole is set", async () => {
  UserMock.findByIdAndUpdate.mockResolvedValue({
    roles: [UserRole.CLIENT, UserRole.WORKER],
    meta_data: { reputation_score: 0, reputation_profile_component: 0 },
  });

  await userRepository.updateWorkerProfile(
    "u1",
    { gender: gender.OTHER },
    { addWorkerRole: true, setLastActiveRole: UserRole.WORKER }
  );

  const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
  const setStage = pipeline[0].$set;
  expect(setStage["meta_data.reputation_score"]).toBe(0);
  expect(setStage["meta_data.reputation_profile_component"]).toBe(0);
});

it("does not touch reputation_score fields on a plain profile edit", async () => {
  UserMock.findByIdAndUpdate.mockResolvedValue({
    meta_data: { reputation_score: 42 },
  });

  await userRepository.updateWorkerProfile("u1", { lifestyle: "Active" });

  const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
  const setStage = pipeline[0].$set;
  expect(setStage["meta_data.reputation_score"]).toBeUndefined();
  expect(setStage["meta_data.reputation_profile_component"]).toBeUndefined();
});

it("createByAdmin defaults reputation_score to 0 for worker roles, 100 otherwise", async () => {
  const worker = (await userRepository.createByAdmin({
    email: "admin-worker@test.com",
    password_hash: "hash",
    full_name: "Admin Worker",
    roles: [UserRole.CLIENT, UserRole.WORKER],
    last_active_role: UserRole.WORKER,
    status: UserStatus.ACTIVE,
    worker_profile: { gender: gender.OTHER },
  })) as unknown as { meta_data: { reputation_score: number } };
  expect(worker.meta_data.reputation_score).toBe(0);

  const client = (await userRepository.createByAdmin({
    email: "admin-client@test.com",
    password_hash: "hash",
    full_name: "Admin Client",
    roles: [UserRole.CLIENT],
    last_active_role: UserRole.CLIENT,
    status: UserStatus.ACTIVE,
    worker_profile: null,
  })) as unknown as { meta_data: { reputation_score: number } };
  expect(client.meta_data.reputation_score).toBe(100);
});
