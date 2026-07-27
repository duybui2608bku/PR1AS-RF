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
