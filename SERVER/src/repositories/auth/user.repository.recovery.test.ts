import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";
import { UserRole } from "../../types/auth/user.types";

jest.mock("../../models/auth/user.model", () => ({
  User: { find: jest.fn() },
}));

const UserMock = User as unknown as { find: jest.Mock };

beforeEach(() => jest.clearAllMocks());

it("excludes workers from the recovery-candidates query", async () => {
  const leanMock = jest.fn().mockResolvedValue([]);
  const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
  const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
  UserMock.find.mockReturnValue({ select: selectMock });

  await userRepository.findReputationRecoveryCandidates();

  expect(UserMock.find).toHaveBeenCalledWith({
    "meta_data.reputation_score": { $lt: 100 },
    roles: { $ne: UserRole.WORKER },
  });
});
