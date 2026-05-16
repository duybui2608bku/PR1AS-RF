import { Document, Types } from "mongoose";
import { WorkerServicePricing } from "./worker-service";

export interface IWorkerFavorite {
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  created_at: Date;
}

export interface IWorkerFavoriteDocument extends IWorkerFavorite, Document {}

export interface WorkerFavoriteServiceItem {
  service_id: string;
  service_code: string;
  pricing: WorkerServicePricing[];
  service: {
    id: string;
    code: string;
    name: { en: string; vi: string; zh?: string | null; ko?: string | null };
    category: string;
  } | null;
}

export interface WorkerFavoriteItem {
  id: string;
  favorited_at: Date;
  full_name: string | null;
  avatar: string | null;
  worker_profile: {
    title: string | null;
    introduction: string | null;
    gallery_urls: string[];
    work_locations: Array<{
      province_code: number;
      ward_code: number | null;
      label_snapshot: string | null;
    }>;
  } | null;
  services: WorkerFavoriteServiceItem[];
}

export interface WorkerFavoriteMutationResult {
  worker_id: string;
  is_favorite: boolean;
}
