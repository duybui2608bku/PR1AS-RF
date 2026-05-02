import { Document, Types } from "mongoose";

export interface IHashtag {
  slug: string;
  display: string;
  created_at: Date;
}

export interface IHashtagDocument extends IHashtag, Document {}

export interface IPostHashtag {
  post_id: Types.ObjectId;
  hashtag_id: Types.ObjectId;
  created_at: Date;
}

export interface IPostHashtagDocument extends IPostHashtag, Document {}

export interface TrendingItem {
  slug: string;
  display: string;
  post_count: number;
}

export interface TrendingQuery {
  window: "24h" | "7d";
  limit: number;
}

export interface PostHashtagPair {
  post_id: Types.ObjectId;
  hashtag_id: Types.ObjectId;
}
