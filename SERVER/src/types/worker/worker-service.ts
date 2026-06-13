import { Document, Types } from "mongoose";

export enum PricingUnit {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
}

export interface WorkerServicePricing {
  unit: PricingUnit;
  duration: number;
  /** Price as entered by the worker, in `currency`. */
  price: number;
  currency: string;
  /** Snapshot of how many VND one unit of `currency` was worth at save time. */
  exchange_rate: number;
  /** Normalised price in VND (= price * exchange_rate), computed server-side. */
  price_vnd: number;
}

export interface IWorkerService {
  worker_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  pricing: WorkerServicePricing[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IWorkerServiceDocument extends IWorkerService, Document {}
