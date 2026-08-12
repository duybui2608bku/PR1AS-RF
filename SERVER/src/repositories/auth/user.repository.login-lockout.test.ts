import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";

jest.mock("../../models/auth/user.model", () => ({
  User: { findOneAndUpdate: jest.fn() },
}));

const UserMock = User as unknown as { findOneAndUpdate: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("incrementFailedLoginAttempts", () => {
  const userId = "507f1f77bcf86cd799439011";
  const lockIfAt = { threshold: 10, lockUntil: new Date("2026-01-01") };

  it("returns the updated attempts and lock state", async () => {
    UserMock.findOneAndUpdate.mockResolvedValue({
      failed_login_attempts: 3,
      locked_until: null,
    });

    const result = await userRepository.incrementFailedLoginAttempts(
      userId,
      lockIfAt
    );

    expect(result).toEqual({ attempts: 3, lockedUntil: null });
  });

  // Regression test: the update argument is an aggregation pipeline (an
  // array), not a plain update document. Mongoose 9 throws "Cannot pass an
  // array to query updates unless the updatePipeline option is set" at
  // runtime unless this flag is present. The mocked model here can't catch
  // that — this test exists to guard the option itself. Found via the same
  // codebase-wide audit that uncovered the identical bug in
  // adjustReputationScore (see user.repository.reputation.test.ts); without
  // this flag, the failed-login counter silently never persists, which
  // defeats the account-lockout brute-force protection entirely.
  it("sets updatePipeline: true, required by Mongoose 9 for array-style updates", async () => {
    UserMock.findOneAndUpdate.mockResolvedValue({
      failed_login_attempts: 1,
      locked_until: null,
    });

    await userRepository.incrementFailedLoginAttempts(userId, lockIfAt);

    const [, , options] = UserMock.findOneAndUpdate.mock.calls[0];
    expect(options.updatePipeline).toBe(true);
  });

  it("returns null when the user no longer exists", async () => {
    UserMock.findOneAndUpdate.mockResolvedValue(null);

    const result = await userRepository.incrementFailedLoginAttempts(
      userId,
      lockIfAt
    );

    expect(result).toBeNull();
  });
});
