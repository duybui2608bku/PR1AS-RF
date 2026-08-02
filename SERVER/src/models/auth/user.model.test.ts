import { User } from "./user.model";

describe("User model - last_active_at", () => {
  it("defaults last_active_at to null on a new document", () => {
    const user = new User({
      email: "presence-test@example.com",
      full_name: "Presence Test",
    });

    expect(user.last_active_at).toBeNull();
  });
});

describe("User model - worker_profile free-text fields", () => {
  it("keeps the new free-text worker_profile fields as provided", () => {
    const user = new User({
      email: "occupation-test@example.com",
      full_name: "Test Worker",
      worker_profile: {
        gender: "OTHER",
        occupation: "Freelance photographer",
        personality: "Cheerful and reliable",
        marital_status: "single",
      },
    });

    expect(user.worker_profile?.occupation).toBe("Freelance photographer");
    expect(user.worker_profile?.personality).toBe("Cheerful and reliable");
    expect(user.worker_profile?.marital_status).toBe("single");
  });
});
