export interface WorkerHashtagCard {
  id: string;
  full_name: string | null;
  avatar: string | null;
  worker_profile: {
    introduction: string | null;
    gallery_urls: string[];
    work_locations: Array<{
      province_code: number;
      ward_code: number | null;
      label_snapshot: string | null;
    }>;
  } | null;
  reputation_score: number;
  matched_hashtags: string[];
}
