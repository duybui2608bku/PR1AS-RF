import { Document, Types } from "mongoose";

export enum PricingUnit {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
}

export interface WorkerServicePricing {
  unit: PricingUnit;
  duration: number;
  price: number;
  currency: string;
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
