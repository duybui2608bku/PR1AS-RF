import { Document, Types } from "mongoose";
import {
  BookingStatus,
  BookingPaymentStatus,
  CancellationReason,
  CancelledBy,
} from "../../constants/booking";
import { PricingUnit } from "../worker/worker-service";

export interface BookingSchedule {
  start_time: Date;
  end_time: Date;
  duration_hours: number;
}

export interface BookingLocation {
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  notes: string;
}

export interface BookingPricing {
  unit: PricingUnit;
  unit_price: number;
  quantity: number;
  subtotal: number;
  platform_fee: number;
  total_amount: number;
  worker_payout: number;
  currency: string;
}

export interface BookingCancellation {
  cancelled_at: Date;
  cancelled_by: CancelledBy;
  reason: CancellationReason;
  notes: string;
  refund_amount: number;
  penalty_amount: number;
}

export interface IBooking {
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  worker_service_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;

  status: BookingStatus;
  payment_status: BookingPaymentStatus;

  escrow_id: Types.ObjectId | null;

  transaction_id: string | null;
  payout_transaction_id: string | null;

  client_notes: string;
  worker_response: string;

  confirmed_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;

  cancellation: BookingCancellation | null;

  created_at: Date;
  updated_at: Date;
}

export interface IBookingDocument extends IBooking, Document {}

export interface CreateBookingInput {
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  worker_service_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  client_notes?: string;
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
  status?: BookingStatus;
  payment_status?: BookingPaymentStatus;
  service_code?: string;
  start_date?: Date;
  end_date?: Date;
  page: number;
  limit: number;
  skip: number;
}

export interface BookingStats {
  total_bookings: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_revenue: number;
}
