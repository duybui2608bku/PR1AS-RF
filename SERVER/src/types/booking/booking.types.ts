import { Document, Types } from "mongoose";
import {
  BookingStatus,
  CancellationReason,
  CancelledBy,
  DisputeReason,
  DisputeResolution,
} from "../../constants/booking";
import { PricingUnit } from "../worker/worker-service";

export interface BookingSchedule {
  start_time: Date;
  end_time: Date;
  duration_hours: number;
}

export interface BookingGuestContact {
  name: string;
  email: string;
  phone?: string | null;
}

export interface BookingPricing {
  unit: PricingUnit;
  quantity: number;
}

export interface BookingCancellation {
  cancelled_at: Date;
  cancelled_by: CancelledBy;
  reason: CancellationReason;
  notes: string;
}

export interface BookingDispute {
  reason: DisputeReason;
  description: string;
  evidence_urls: string[];
  disputed_by: string;
  disputed_at: Date;
  resolution: DisputeResolution | null;
  resolution_notes: string;
  resolved_by: string | null;
  resolved_at: Date | null;
}

export interface IBooking {
  client_id: Types.ObjectId | null;
  worker_id: Types.ObjectId;
  worker_service_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  guest_contact?: BookingGuestContact | null;
  is_guest?: boolean;
  public_ref?: string | null;

  status: BookingStatus;

  client_notes: string;
  worker_response: string;

  confirmed_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  disputed_at: Date | null;

  cancellation: BookingCancellation | null;
  dispute: BookingDispute | null;

  created_at: Date;
  updated_at: Date;
}

export interface IBookingDocument extends IBooking, Document {}

export interface CreateBookingInput {
  client_id?: Types.ObjectId | null;
  worker_id: Types.ObjectId;
  worker_service_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  client_notes?: string;
  guest_contact?: BookingGuestContact | null;
  is_guest?: boolean;
  public_ref?: string | null;
}

export interface UpdateBookingStatusInput {
  booking_id: Types.ObjectId;
  status: BookingStatus;
  worker_response?: string;
}

export interface CancelBookingInput {
  booking_id: Types.ObjectId;
  cancelled_by: CancelledBy;
  reason: CancellationReason;
  notes?: string;
}

export interface BookingQuery {
  client_id?: Types.ObjectId;
  worker_id?: Types.ObjectId;
  role?: "client" | "worker";
  status?: BookingStatus;
  service_code?: string;
  search?: string;
  is_guest?: boolean;
  start_date?: Date;
  end_date?: Date;
  page: number;
  limit: number;
  skip: number;
}

export interface AdminBookingAnalyticsQuery {
  start_date?: Date;
  end_date?: Date;
  recent_limit: number;
}

export interface BookingStatusCount {
  status: BookingStatus;
  count: number;
}

export interface BookingDailyCount {
  date: string;
  count: number;
}

export interface BookingCompletionDailyCount {
  date: string;
  total: number;
  completed: number;
  completion_rate: number;
}

export interface AdminBookingAnalyticsRaw {
  total: number;
  status_counts: BookingStatusCount[];
  created_by_date: BookingDailyCount[];
  completion_by_date: Omit<BookingCompletionDailyCount, "completion_rate">[];
  recent_bookings: IBookingDocument[];
}

export interface AdminBookingAnalytics {
  total_bookings: number;
  completed_bookings: number;
  completion_rate: number;
  cancelled_bookings: number;
  cancellation_rate: number;
  disputed_bookings: number;
  dispute_rate: number;
  status_counts: Array<BookingStatusCount & { percentage: number }>;
  created_by_date: BookingDailyCount[];
  completion_by_date: BookingCompletionDailyCount[];
  recent_bookings: IBookingDocument[];
}

export interface BookingStats {
  total_bookings: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}
