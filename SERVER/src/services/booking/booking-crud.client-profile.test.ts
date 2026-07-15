import { BookingCrudService } from "./booking-crud.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { BookingStatus } from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    countClientBookingStats: jest.fn(),
  },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const service = new BookingCrudService();

const WORKER_ID = "6512aaaa0000000000000001";
const CLIENT_ID = "6512bbbb0000000000000002";

const bookingDoc = (over: Record<string, unknown> = {}) =>
  ({
    _id: { toString: () => "booking1" },
    worker_id: { _id: { toString: () => WORKER_ID }, toString: () => "[object Object]" },
    client_id: { _id: { toString: () => CLIENT_ID }, toString: () => CLIENT_ID },
    status: BookingStatus.PENDING,
    ...over,
  }) as never;

const clientUser = {
  _id: { toString: () => CLIENT_ID },
  full_name: "Nguyen Van A",
  avatar: "https://cdn/x.png",
  verify_email: true,
  created_at: new Date("2025-01-02T03:04:05.000Z"),
  meta_data: { reputation_score: 87 },
} as never;

beforeEach(() => jest.clearAllMocks());

it("returns a curated client profile for the owning worker on a PENDING booking", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc());
  userRepo.findById.mockResolvedValue(clientUser);
  bookingRepo.countClientBookingStats.mockResolvedValue({
    total: 10,
    completed: 6,
    clientCancelled: 2,
  });

  const result = await service.getClientProfileForBooking("booking1", WORKER_ID);

  expect(result).toEqual({
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

it("throws 404 when the booking does not exist", async () => {
  bookingRepo.findById.mockResolvedValue(null);
  await expect(
    service.getClientProfileForBooking("missing", WORKER_ID)
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
});

it("throws 403 when the requester is not the booking's worker", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc());
  await expect(
    service.getClientProfileForBooking("booking1", "9999999999999999999999ff")
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN });
});

it("returns the profile for the owning worker regardless of booking status", async () => {
  bookingRepo.findById.mockResolvedValue(
    bookingDoc({ status: BookingStatus.CONFIRMED })
  );
  userRepo.findById.mockResolvedValue(clientUser);
  bookingRepo.countClientBookingStats.mockResolvedValue({
    total: 3,
    completed: 3,
    clientCancelled: 0,
  });

  const result = await service.getClientProfileForBooking("booking1", WORKER_ID);

  expect(result.full_name).toBe("Nguyen Van A");
  expect(result.completed_count).toBe(3);
});

it("throws 404 for a guest booking with no client_id", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc({ client_id: null }));
  await expect(
    service.getClientProfileForBooking("booking1", WORKER_ID)
  ).rejects.toBeInstanceOf(AppError);
});
