export type { RoleInfo } from "./booking-helpers";
export { BookingDisputeService as BookingService } from "./booking-dispute.service";

import { BookingDisputeService } from "./booking-dispute.service";

class BookingService extends BookingDisputeService {}

export const bookingService = new BookingService();
