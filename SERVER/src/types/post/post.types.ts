import { Document, Types } from "mongoose";
import { PostMediaType, PostVisibility } from "../../constants/post";

export interface IPost {
  author_id: Types.ObjectId;
  body: string;
  visibility: PostVisibility;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface IPostDocument extends IPost, Document {}

export interface IPostMedia {
  post_id: Types.ObjectId;
  sort_order: number;
  type: PostMediaType;
  url: string;
  storage_key: string | null;
  mime_type: string | null;
  byte_size: number | null;
  duration_seconds: number | null;
  created_at: Date;
}

export interface IPostMediaDocument extends IPostMedia, Document {}

export interface CreatePostMediaInput {
  type: PostMediaType;
  url: string;
  sort_order?: number;
  mime_type?: string | null;
  byte_size?: number | null;
  duration_seconds?: number | null;
  storage_key?: string | null;
}

export interface CreatePostInput {
  body: string;
  media?: CreatePostMediaInput[];
  visibility?: PostVisibility;
}

export interface UpdatePostInput {
  body?: string;
  media?: CreatePostMediaInput[];
  visibility?: PostVisibility;
}

export interface PostFeedQuery {
  cursor?: string;
  limit: number;
  author_id?: string;
  hashtag?: string;
}

export interface AuthorPublic {
  id: string;
  full_name: string | null;
  avatar: string | null;
  has_worker_profile: boolean;
}

export interface PostMediaPublic {
  id: string;
  type: PostMediaType;
  url: string;
  sort_order: number;
  mime_type: string | null;
  byte_size: number | null;
  duration_seconds: number | null;
}

export interface HashtagPublic {
  slug: string;
  display: string;
}

export interface PostPublic {
  id: string;
  author: AuthorPublic;
  body: string;
  media: PostMediaPublic[];
  hashtags: HashtagPublic[];
  visibility: PostVisibility;
  created_at: Date;
  updated_at: Date;
}

export interface PostStatsPublic {
  published_posts_count: number;
}
