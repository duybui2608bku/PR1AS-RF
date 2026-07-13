import { BookingAutoCompleteService } from "./booking-auto-complete.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BOOKING_LIMITS, BookingStatus } from "../../constants/booking";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findFinishedBookingsForAutoComplete: jest.fn(),
    autoCompleteBooking: jest.fn(),
  },
}));
jest.mock("../notification", () => ({
  notificationEventService: {
    bookingStatusUpdated: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn().mockResolvedValue(undefined),
}));

const repo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const service = new BookingAutoCompleteService();
const now = new Date("2026-01-01T18:00:00Z");
const booking = (id: string) => ({ _id: { toString: () => id } }) as never;

beforeEach(() => jest.clearAllMocks());

it("gives started bookings a short grace and CONFIRMED ones the full dispute window", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([]);

  await service.completeFinishedBookings(now);

  const [startedCutoff, unstartedCutoff] =
    repo.findFinishedBookingsForAutoComplete.mock.calls[0];
  expect(now.getTime() - startedCutoff.getTime()).toBe(
    BOOKING_LIMITS.AUTO_COMPLETE_HOURS * 60 * 60 * 1000
  );
  expect(now.getTime() - unstartedCutoff.getTime()).toBe(
    BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS * 24 * 60 * 60 * 1000
  );
  // CONFIRMED bị auto-complete đúng lúc cửa sổ khiếu nại tính-từ-end_time đóng lại,
  // nên dispute deadline buộc phải neo theo completed_at mới còn ý nghĩa.
  expect(BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS).toBe(
    BOOKING_LIMITS.DISPUTE_WINDOW_DAYS
  );
});

it("counts only bookings the atomic update actually flipped to COMPLETED", async () => {
  repo.findFinishedBookingsForAutoComplete.mockResolvedValue([
    booking("a"),
    booking("b"),
  ]);
  // "b" đã bị client bấm dispute ngay trước job → guard status trong query trả null
  repo.autoCompleteBooking
    .mockResolvedValueOnce({ status: BookingStatus.COMPLETED } as never)
    .mockResolvedValueOnce(null);

  const result = await service.completeFinishedBookings(now);

  expect(result).toEqual({ scanned_count: 2, completed_count: 1 });
});
