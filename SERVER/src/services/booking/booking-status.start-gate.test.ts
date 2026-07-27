import { BookingStatusService } from "./booking-status.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BookingStatus } from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { BOOKING_MESSAGES } from "../../constants/messages";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: { bookingStatusUpdated: jest.fn() },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn(),
}));

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const service = new BookingStatusService();

const WORKER_ID = "6512aaaa0000000000000001";
const CLIENT_ID = "6512bbbb0000000000000002";
const HOUR = 60 * 60 * 1000;

const confirmedBooking = (startTime: Date) =>
  ({
    _id: { toString: () => "booking1" },
    worker_id: { _id: { toString: () => WORKER_ID } },
    client_id: { _id: { toString: () => CLIENT_ID } },
    status: BookingStatus.CONFIRMED,
    schedule: { start_time: startTime, end_time: new Date(+startTime + HOUR) },
  }) as never;

const roleInfo = { isWorker: true, isClient: false };

beforeEach(() => {
  jest.clearAllMocks();
  (
    require("../notification") as {
      notificationEventService: { bookingStatusUpdated: jest.Mock };
    }
  ).notificationEventService.bookingStatusUpdated.mockResolvedValue(undefined);
  (
    require("./booking-email") as { sendQuickBookingStatusEmail: jest.Mock }
  ).sendQuickBookingStatusEmail.mockResolvedValue(undefined);
});

it("rejects starting a booking before its scheduled start time", async () => {
  bookingRepo.findById.mockResolvedValue(
    confirmedBooking(new Date(Date.now() + HOUR))
  );

  await expect(
    service.updateBookingStatus(
      "booking1",
      WORKER_ID,
      BookingStatus.IN_PROGRESS,
      roleInfo
    )
  ).rejects.toThrow(
    new AppError(BOOKING_MESSAGES.CANNOT_START_BEFORE_SCHEDULE, 400)
  );
  expect(bookingRepo.updateStatus).not.toHaveBeenCalled();
});

it("allows starting once the scheduled start time has passed", async () => {
  const booking = confirmedBooking(new Date(Date.now() - HOUR));
  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(booking);

  await service.updateBookingStatus(
    "booking1",
    WORKER_ID,
    BookingStatus.IN_PROGRESS,
    roleInfo
  );

  expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
    "booking1",
    BookingStatus.IN_PROGRESS,
    expect.objectContaining({ started_at: expect.any(Date) })
  );
});
