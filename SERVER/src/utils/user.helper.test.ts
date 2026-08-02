import { toPublicUser } from "./user.helper";
import { UserRole, UserStatus, IUserDocument } from "../types/auth/user.types";

const baseUser = (
  overrides: Partial<Omit<IUserDocument, "meta_data">> & {
    meta_data?: Partial<IUserDocument["meta_data"]>;
  }
): IUserDocument =>
  ({
    _id: { toString: () => "u1" },
    email: "a@test.com",
    avatar: null,
    full_name: "Test",
    phone: null,
    roles: [UserRole.CLIENT],
    status: UserStatus.ACTIVE,
    last_active_role: UserRole.CLIENT,
    verify_email: true,
    created_by_admin: false,
    worker_profile: null,
    client_profile: null,
    created_at: new Date(),
    last_login: null,
    coords: { latitude: null, longitude: null },
    meta_data: {},
    ...overrides,
  }) as unknown as IUserDocument;

describe("toPublicUser reputation fallback", () => {
  it("falls back to 0 for a worker with no stored score", () => {
    const user = baseUser({ roles: [UserRole.CLIENT, UserRole.WORKER] });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(0);
  });

  it("falls back to 100 for a client with no stored score", () => {
    const user = baseUser({ roles: [UserRole.CLIENT] });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(100);
  });

  it("prefers the stored score over any fallback", () => {
    const user = baseUser({
      roles: [UserRole.WORKER],
      meta_data: { reputation_score: 55 },
    });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(55);
  });
});
