import { userService } from "./user.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { moderationService } from "../moderation/moderation.service";
import { UserStatus } from "../../types/auth/user.types";
import { HTTP_STATUS } from "../../constants/httpStatus";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { findById: jest.fn() },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { countClientBookingStats: jest.fn() },
}));
jest.mock("../moderation/moderation.service", () => ({
  moderationService: { isProfileBlocked: jest.fn() },
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const moderation = moderationService as jest.Mocked<typeof moderationService>;

const CLIENT_ID = "6512bbbb0000000000000002";
const VIEWER_ID = "6512cccc0000000000000003";

const clientUser = (over: Record<string, unknown> = {}) =>
  ({
    _id: { toString: () => CLIENT_ID },
    full_name: "Nguyen Van A",
    avatar: "https://cdn/x.png",
    email: "a@example.com",
    phone: "0900000000",
    verify_email: true,
    status: UserStatus.ACTIVE,
    created_at: new Date("2025-01-02T03:04:05.000Z"),
    meta_data: { reputation_score: 87 },
    ...over,
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  moderation.isProfileBlocked.mockResolvedValue(false);
  bookingRepo.countClientBookingStats.mockResolvedValue({
    total: 10,
    completed: 6,
    clientCancelled: 2,
  });
});

it("returns only whitelisted fields — never email or phone", async () => {
  userRepo.findById.mockResolvedValue(clientUser());

  const result = await userService.getClientPublicProfileForViewer(
    CLIENT_ID,
    VIEWER_ID
  );

  expect(result).toEqual({
    id: CLIENT_ID,
    full_name: "Nguyen Van A",
    avatar: "https://cdn/x.png",
    member_since: "2025-01-02T03:04:05.000Z",
    is_verified: true,
    reputation_score: 87,
    total_count: 10,
    completed_count: 6,
    client_cancelled_count: 2,
  });
});

it("throws 404 when the viewer has profile-blocked the client", async () => {
  moderation.isProfileBlocked.mockResolvedValue(true);

  await expect(
    userService.getClientPublicProfileForViewer(CLIENT_ID, VIEWER_ID)
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
  expect(userRepo.findById).not.toHaveBeenCalled();
});

it.each([UserStatus.DELETED, UserStatus.PENDING_DELETE])(
  "throws 404 for a %s account (data is scrubbed)",
  async (status) => {
    userRepo.findById.mockResolvedValue(clientUser({ status }));

    await expect(
      userService.getClientPublicProfileForViewer(CLIENT_ID, VIEWER_ID)
    ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
  }
);

it("throws 404 when the user does not exist", async () => {
  userRepo.findById.mockResolvedValue(null);

  await expect(
    userService.getClientPublicProfileForViewer(CLIENT_ID, VIEWER_ID)
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
});

it("defaults reputation to 100 when meta_data is missing", async () => {
  userRepo.findById.mockResolvedValue(clientUser({ meta_data: undefined }));

  const result = await userService.getClientPublicProfile(CLIENT_ID);

  expect(result.reputation_score).toBe(100);
});
