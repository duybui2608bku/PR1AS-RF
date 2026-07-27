jest.mock("../../../config/socket.handlers", () => ({
  isUserOnline: jest.fn(),
}));

import { Types } from "mongoose";
import { toAuthorPublic } from "../post.service";
import { isUserOnline } from "../../../config/socket.handlers";

describe("toAuthorPublic presence", () => {
  it("reports the author online with their last_active_at when connected", () => {
    (isUserOnline as jest.Mock).mockReturnValue(true);
    const lastActiveAt = new Date("2026-07-28T08:00:00.000Z");
    const authorId = new Types.ObjectId();

    const post = {
      author_id: {
        _id: authorId,
        full_name: "Author One",
        avatar: null,
        worker_profile: null,
        meta_data: { pricing_plan_code: "STANDARD" },
        last_active_at: lastActiveAt,
      },
    } as any;

    const result = toAuthorPublic(post, authorId);

    expect(result.presence).toEqual({ is_online: true, last_active_at: lastActiveAt });
  });

  it("falls back to an offline, no-presence author when author_id failed to populate", () => {
    const fallbackId = new Types.ObjectId();
    const post = { author_id: null } as any;

    const result = toAuthorPublic(post, fallbackId);

    expect(result.presence).toEqual({ is_online: false, last_active_at: null });
  });

  it("forces offline/null presence when the author is an admin, even if their socket is connected", () => {
    (isUserOnline as jest.Mock).mockReturnValue(true);
    const lastActiveAt = new Date("2026-07-28T08:00:00.000Z");
    const authorId = new Types.ObjectId();

    const post = {
      author_id: {
        _id: authorId,
        full_name: "Admin Author",
        avatar: null,
        worker_profile: null,
        meta_data: { pricing_plan_code: null },
        last_active_at: lastActiveAt,
        roles: ["admin"],
      },
    } as any;

    const result = toAuthorPublic(post, authorId);

    expect(result.presence).toEqual({ is_online: false, last_active_at: null });
  });
});
