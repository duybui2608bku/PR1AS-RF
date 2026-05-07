import { IUserDocument } from "../auth/user.types";
import { ReviewStats } from "../review/review.types";
import { WorkerServicePricing } from "./worker-service";

export interface WorkerReviewItem {
  id: string;
  rating: number;
  comment: string;
  client: {
    id: string;
    full_name: string | null;
    avatar: string | null;
  };
  worker_reply: string | null;
  worker_replied_at: Date | null;
  created_at: Date;
}

export interface WorkerScheduleItem {
  booking_id: string;
  start_time: Date;
  end_time: Date;
  status: string;
}

export interface WorkerDetailResponse {
  user: {
    id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  };
  worker_profile: IUserDocument["worker_profile"] | null;
  services?: Array<{
    _id: string;
    service_id: string;
    service_code: string;
    pricing: WorkerServicePricing[];
    is_active: boolean;
  }>;
  review_stats?: ReviewStats;
  reviews?: WorkerReviewItem[];
}

export interface WorkersGroupedByServiceItem {
  service: {
    id: string;
    code: string;
    name: { en: string; vi: string; zh?: string | null; ko?: string | null };
    description: { en: string; vi: string; zh?: string | null; ko?: string | null };
    category: string;
  };
  workers: Array<{
    id: string;
    full_name: string | null;
    avatar: string | null;
    worker_profile: {
      title: string | null;
      introduction: string | null;
      gallery_urls: string[];
    } | null;
    pricing: WorkerServicePricing[];
  }>;
}
