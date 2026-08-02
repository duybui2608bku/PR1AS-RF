import { Types } from "mongoose";
import { Booking } from "../../models/booking/booking.model";
import { bookingRepository } from "./booking.repository";
import {
  BookingStatus,
  BOOKING_SCHEDULE_BLOCKING_STATUSES,
  CancelledBy,
} from "../../constants/booking";

jest.mock("../../models/booking/booking.model", () => ({
  Booking: { updateMany: jest.fn() },
}));

const BookingMock = Booking as unknown as { updateMany: jest.Mock };

beforeEach(() => jest.clearAllMocks());

it("cancels every active booking tied to the user as client or worker", async () => {
  BookingMock.updateMany.mockResolvedValue({ modifiedCount: 2 });
  const userId = "6512aaaa0000000000000001";

  const count = await bookingRepository.cancelActiveBookingsForUser(userId);

  expect(count).toBe(2);
  expect(BookingMock.updateMany).toHaveBeenCalledWith(
    {
      $or: [
        { client_id: new Types.ObjectId(userId) },
        { worker_id: new Types.ObjectId(userId) },
      ],
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
    },
    expect.objectContaining({
      status: BookingStatus.CANCELLED,
      cancellation: expect.objectContaining({ cancelled_by: CancelledBy.SYSTEM }),
    })
  );
});
