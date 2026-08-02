import { BookingStatusService } from "./booking-status.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BookingStatus, CancellationReason, CancelledBy } from "../../constants/booking";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: { bookingCancelled: jest.fn() },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn(),
}));

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const service = new BookingStatusService();

const CLIENT_ID = "6512bbbb0000000000000002";

beforeEach(() => {
  jest.clearAllMocks();
  (
    require("../notification") as {
      notificationEventService: { bookingCancelled: jest.Mock };
    }
  ).notificationEventService.bookingCancelled.mockResolvedValue(undefined);
  (
    require("./booking-email") as { sendQuickBookingStatusEmail: jest.Mock }
  ).sendQuickBookingStatusEmail.mockResolvedValue(undefined);
});

it("lets the client cancel a booking whose worker account no longer exists", async () => {
  // Simulates Mongoose .populate() resolving worker_id to null because the
  // referenced User document was hard-deleted (e.g. deleteUserByAdmin).
  const booking = {
    _id: { toString: () => "booking1" },
    worker_id: null,
    client_id: { _id: { toString: () => CLIENT_ID } },
    status: BookingStatus.PENDING,
    schedule: {
      start_time: new Date(Date.now() + 100 * 60 * 60 * 1000),
      end_time: new Date(Date.now() + 101 * 60 * 60 * 1000),
    },
  } as never;

  bookingRepo.findById.mockResolvedValue(booking);
  bookingRepo.updateStatus.mockResolvedValue(booking);

  const roleInfo = { isWorker: false, isClient: true };

  await expect(
    service.cancelBooking(
      "booking1",
      CLIENT_ID,
      CancellationReason.CLIENT_REQUEST,
      "",
      roleInfo
    )
  ).resolves.toBe(booking);

  expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
    "booking1",
    BookingStatus.CANCELLED,
    expect.objectContaining({
      cancellation: expect.objectContaining({ cancelled_by: CancelledBy.CLIENT }),
    })
  );
});
