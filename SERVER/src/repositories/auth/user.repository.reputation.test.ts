import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";

jest.mock("../../models/auth/user.model", () => ({
  User: { findByIdAndUpdate: jest.fn() },
}));

const UserMock = User as unknown as { findByIdAndUpdate: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("adjustReputationScore defaultScore", () => {
  it("falls back the previous score to 0 when defaultScore=0 and the field is missing", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ meta_data: {} }),
    });

    const result = await userRepository.adjustReputationScore("u1", 10, 0);

    expect(result).toEqual({ previousScore: 0, newScore: 10 });
  });

  it("falls back the previous score to 100 when defaultScore is omitted", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ meta_data: {} }),
    });

    const result = await userRepository.adjustReputationScore("u1", -10);

    expect(result).toEqual({ previousScore: 100, newScore: 90 });
  });

  it("bakes the defaultScore into the aggregation pipeline's $ifNull fallback", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest
        .fn()
        .mockResolvedValue({ meta_data: { reputation_score: 20 } }),
    });

    await userRepository.adjustReputationScore("u1", 5, 0);

    const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
    const setStage = pipeline[0].$set["meta_data.reputation_score"];
    const ifNullClause = setStage.$max[1].$min[1].$add[0].$ifNull;
    expect(ifNullClause).toEqual(["$meta_data.reputation_score", 0]);
  });
});
