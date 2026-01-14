import mongoose, { Schema } from "mongoose";
import {
  BookingStatus,
  BookingPaymentStatus,
  CancellationReason,
  CancelledBy,
  BOOKING_LIMITS,
} from "../../constants/booking";
import { PricingUnit } from "../../types/worker/worker-service";
import { IBookingDocument } from "../../types/booking";
import { modelsName } from "../models.name";

const scheduleSchema = new Schema(
  {
    start_time: {
      type: Date,
      required: true,
      index: true,
    },
    end_time: {
      type: Date,
      required: true,
      index: true,
    },
    duration_hours: {
      type: Number,
      default: 0,
      min: BOOKING_LIMITS.MIN_DURATION_HOURS,
      max: BOOKING_LIMITS.MAX_DURATION_HOURS,
    },
  },
  { _id: false }
);

const pricingSchema = new Schema(
  {
    unit: {
      type: String,
      enum: Object.values(PricingUnit),
      required: true,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    platform_fee: {
      type: Number,
      required: true,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    worker_payout: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
      uppercase: true,
      trim: true,
    },
  },
  { _id: false }
);

const cancellationSchema = new Schema(
  {
    cancelled_at: {
      type: Date,
      required: true,
    },
    cancelled_by: {
      type: String,
      enum: Object.values(CancelledBy),
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(CancellationReason),
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    refund_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    penalty_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const bookingSchema = new Schema<IBookingDocument>(
  {
    client_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    worker_service_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.WORKER_SERVICE,
      required: true,
    },
    service_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.SERVICE,
      required: true,
    },
    service_code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    schedule: {
      type: scheduleSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    payment_status: {
      type: String,
      enum: Object.values(BookingPaymentStatus),
      default: BookingPaymentStatus.PENDING,
      index: true,
    },
    escrow_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.ESCROW,
      default: null,
    },
    transaction_id: {
      type: String,
      default: null,
    },
    payout_transaction_id: {
      type: String,
      default: null,
    },
    client_notes: {
      type: String,
      default: "",
      trim: true,
    },
    worker_response: {
      type: String,
      default: "",
      trim: true,
    },
    confirmed_at: {
      type: Date,
      default: null,
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    cancellation: {
      type: cancellationSchema,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.BOOKING,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

bookingSchema.index({ client_id: 1, created_at: -1 });
bookingSchema.index({ worker_id: 1, created_at: -1 });
bookingSchema.index({ status: 1, payment_status: 1 });
bookingSchema.index({ worker_id: 1, status: 1, "schedule.start_time": 1 });
bookingSchema.index({ "schedule.start_time": 1, "schedule.end_time": 1 });
bookingSchema.index({ service_code: 1 });
bookingSchema.index({ escrow_id: 1 });

export const Booking = mongoose.model<IBookingDocument>(
  modelsName.BOOKING,
  bookingSchema
);
