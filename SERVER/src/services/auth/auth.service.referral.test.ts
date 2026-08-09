import { Types } from "mongoose";

import { authService } from "./auth.service";
import { userRepository } from "../../repositories/auth/user.repository";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByReferralCode: jest.fn(),
    setReferralCodeIfEmpty: jest.fn(),
    countReferrals: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock("../../utils/bcrypt", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed"),
  comparePassword: jest.fn(),
}));
jest.mock("../../utils/nodemailer", () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
}));

const repo = userRepository as unknown as Record<string, jest.Mock>;

const fakeUser = (over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  email: "new@example.com",
  roles: ["client"],
  meta_data: {},
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe("register with a referral code", () => {
  it("rejects an unknown code before creating anything", async () => {
    repo.findByReferralCode.mockResolvedValue(null);

    await expect(
      authService.register({
        email: "new@example.com",
        password: "Password1",
        referral_code: "DEADBEEF",
      })
    ).rejects.toThrow();

    expect(repo.findByEmail).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("stores the referrer id on the new account", async () => {
    const referrer = fakeUser({ email: "referrer@example.com" });
    repo.findByReferralCode.mockResolvedValue(referrer);
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue(fakeUser());

    await authService.register({
      email: "new@example.com",
      password: "Password1",
      referral_code: "A1B2C3D4",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ referred_by: referrer._id })
    );
  });
});

describe("getReferralInfo", () => {
  it("reuses an existing code and reports the referral count", async () => {
    repo.findById.mockResolvedValue(fakeUser({ referral_code: "AABBCCDD" }));
    repo.countReferrals.mockResolvedValue(3);

    await expect(authService.getReferralInfo("u1")).resolves.toEqual({
      code: "AABBCCDD",
      total_referred: 3,
    });
    expect(repo.setReferralCodeIfEmpty).not.toHaveBeenCalled();
  });

  it("generates a code on first read", async () => {
    repo.findById.mockResolvedValue(fakeUser({ referral_code: null }));
    repo.setReferralCodeIfEmpty.mockImplementation((_id, code) =>
      Promise.resolve({ referral_code: code })
    );
    repo.countReferrals.mockResolvedValue(0);

    const result = await authService.getReferralInfo("u1");

    expect(result.code).toMatch(/^[0-9A-F]{8}$/);
    expect(result.total_referred).toBe(0);
  });
});
