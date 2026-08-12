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

  // Regression test: the update argument here is an aggregation pipeline
  // (an array, e.g. `[{ $set: {...} }]`), not a plain update document.
  // Mongoose 9 throws `Cannot pass an array to query updates unless the
  // updatePipeline option is set` at runtime unless this flag is present —
  // a real, deterministic failure that every mocked unit test in this file
  // (and every reputation-scoring test in the whole codebase) is blind to,
  // since none of them exercise real Mongoose validation. This one test
  // is what stands between "every reputation deduction/bonus in the app
  // silently no-ops in production" and working code — do not remove.
  it("sets updatePipeline: true, required by Mongoose 9 for array-style updates", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ meta_data: {} }),
    });

    await userRepository.adjustReputationScore("u1", 5, 0);

    const [, , options] = UserMock.findByIdAndUpdate.mock.calls[0];
    expect(options.updatePipeline).toBe(true);
  });
});
