export type { RoleInfo } from "./booking-helpers";

import { BookingCrudService } from "./booking-crud.service";
import { BookingStatusService } from "./booking-status.service";
import { BookingDisputeService } from "./booking-dispute.service";

/**
 * Facade that composes focused sub-services.
 * Each sub-service extends BookingBaseService independently — no inheritance chain.
 */
class BookingService {
  private readonly crud = new BookingCrudService();
  private readonly status = new BookingStatusService();
  private readonly dispute = new BookingDisputeService();

  createBooking = this.crud.createBooking.bind(this.crud);
  getBookingById = this.crud.getBookingById.bind(this.crud);
  getBookingsByClient = this.crud.getBookingsByClient.bind(this.crud);
  getBookingsByWorker = this.crud.getBookingsByWorker.bind(this.crud);
  getMyBookings = this.crud.getMyBookings.bind(this.crud);
  getAdminBookingAnalytics = this.crud.getAdminBookingAnalytics.bind(this.crud);
  updateBooking = this.crud.updateBooking.bind(this.crud);

  updateBookingStatus = this.status.updateBookingStatus.bind(this.status);
  cancelBooking = this.status.cancelBooking.bind(this.status);

  createDispute = this.dispute.createDispute.bind(this.dispute);
  resolveDispute = this.dispute.resolveDispute.bind(this.dispute);
}

export { BookingService };
export const bookingService = new BookingService();
